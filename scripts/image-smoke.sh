#!/usr/bin/env bash
# Runs a built image and fails unless:
#   - its Node version equals .nvmrc;
#   - it runs as a non-root user;
#   - Node rejects the eMudhra test host with a certificate error;
#   - the server answers /health and stops on SIGTERM.
#
#   scripts/image-smoke.sh <image>
set -euo pipefail

image="${1:?usage: $0 <image>}"
expected="$(sed 's/^v//' "$(dirname "$0")/../.nvmrc" | tr -d '[:space:]')"

actual="$(docker run --rm --entrypoint node "$image" -p process.versions.node)"
echo "node $actual"
test "$actual" = "$expected" || { echo "::error::image runs Node $actual, .nvmrc declares $expected"; exit 1; }

uid="$(docker run --rm --entrypoint id "$image" -u)"
echo "uid $uid"
test "$uid" != "0" || { echo "::error::image runs as root"; exit 1; }

# The trust store must reject the chain. A DNS or network error is not a pass.
docker run --rm --entrypoint node "$image" -e '
  const url = "https://dv-g3b-emudhra.we-have-a-problem.com/";
  const certErrors = ["CERT_REVOKED", "CERT_UNTRUSTED", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"];
  fetch(url, { signal: AbortSignal.timeout(20000) }).then(
    (res) => { console.log(`::error::${url} answered ${res.status}: the image trusts the eMudhra chain`); process.exit(1); },
    (err) => {
      const code = err.cause?.code ?? err.name;
      console.log(`emudhra ${code}`);
      process.exit(certErrors.includes(code) ? 0 : 1);
    });'

name="shopify-tracker-smoke-$$"
docker run -d --name "$name" "$image" > /dev/null
trap 'docker rm -f "$name" > /dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do
  docker exec "$name" wget -qO- http://127.0.0.1:9091/health > /dev/null 2>&1 && break
  sleep 1
done
docker exec "$name" wget -qO- http://127.0.0.1:9091/health || { docker logs "$name"; echo "::error::/health did not answer"; exit 1; }
echo
docker stop -t 10 "$name" > /dev/null
code="$(docker inspect -f '{{.State.ExitCode}}' "$name")"
echo "exit after SIGTERM $code"
# 137 means docker killed it after the grace period: SIGTERM did not stop the server.
test "$code" != "137" || { echo "::error::the server ignored SIGTERM"; exit 1; }
