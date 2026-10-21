#!/usr/bin/env bash
# Runs a built image and fails unless:
#   - its Node version equals .nvmrc;
#   - it runs as a non-root user;
#   - Node rejects the eMudhra test host with a certificate error;
#   - the server answers /health and stops on SIGTERM.
#
#   scripts/image-smoke.sh <image>
#
# The trust-store check fails closed. It passes only on a certificate-chain
# error from the eMudhra test host, and only when the control host connects,
# so an image with no CA roots cannot pass. EMUDHRA_UNREACHABLE=warn turns a
# DNS or connection error on the test host into a warning, so an outage of
# that host cannot block a release. Every other error fails.
set -euo pipefail

image="${1:?usage: $0 <image>}"
expected="$(sed 's/^v//' "$(dirname "$0")/../.nvmrc" | tr -d '[:space:]')"

actual="$(docker run --rm --entrypoint node "$image" -p process.versions.node)"
echo "node $actual"
test "$actual" = "$expected" || { echo "::error::image runs Node $actual, .nvmrc declares $expected"; exit 1; }

uid="$(docker run --rm --entrypoint id "$image" -u)"
echo "uid $uid"
test "$uid" != "0" || { echo "::error::image runs as root"; exit 1; }

docker run --rm -e EMUDHRA_UNREACHABLE="${EMUDHRA_UNREACHABLE:-fail}" --entrypoint node "$image" -e '
  const rejected = ["CERT_REVOKED", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_UNTRUSTED", "SELF_SIGNED_CERT_IN_CHAIN"];
  const unreachable = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"];
  const probe = (url) => fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) }).then(
    (res) => ({ status: res.status }),
    (err) => ({ code: err.code ?? err.cause?.code ?? err.name }));
  (async () => {
    const control = await probe("https://api.stripe.com/");
    console.log(`control api.stripe.com ${control.status ?? control.code}`);
    if (control.status === undefined) {
      console.log("::error::the control host did not connect over TLS: the image has no working CA roots or no network");
      process.exit(1);
    }
    const url = "https://dv-g3b-emudhra.we-have-a-problem.com/";
    const test = await probe(url);
    console.log(`emudhra ${test.status ?? test.code}`);
    if (test.status !== undefined) {
      console.log(`::error::${url} answered ${test.status}: the image trusts the eMudhra chain`);
      process.exit(1);
    }
    if (rejected.includes(test.code)) process.exit(0);
    if (unreachable.includes(test.code) && process.env.EMUDHRA_UNREACHABLE === "warn") {
      console.log(`::warning::${url} is unreachable (${test.code}); the trust-store check did not run`);
      process.exit(0);
    }
    console.log(`::error::${url} failed with ${test.code}, which is not a certificate-chain rejection`);
    process.exit(1);
  })();'

name="shopify-tracker-smoke-$$"
docker run -d --name "$name" "$image" > /dev/null
trap 'docker rm -f "$name" > /dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do
  docker exec "$name" wget -qO- http://127.0.0.1:9091/health > /dev/null 2>&1 && break
  sleep 1
done
docker exec "$name" wget -qO- http://127.0.0.1:9091/health || { docker logs "$name"; echo "::error::/health did not answer"; exit 1; }
echo
test "$(docker inspect -f '{{.State.Running}}' "$name")" = true || { docker logs "$name"; echo "::error::the server exited before SIGTERM"; exit 1; }
docker stop -t 10 "$name" > /dev/null
code="$(docker inspect -f '{{.State.ExitCode}}' "$name")"
echo "exit after SIGTERM $code"
# tini returns 143 when SIGTERM ends Node. 137 means docker killed it after the
# grace period; any other code means the server crashed.
test "$code" = "143" || test "$code" = "0" || { docker logs "$name"; echo "::error::the server did not stop cleanly on SIGTERM (exit $code)"; exit 1; }
