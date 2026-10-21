# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# check=error=true

FROM node:24.22.1-alpine3.24@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS base

# .nvmrc is the one Node version source. A digest pins content, not a version,
# so only the binary proves which Node shipped. A FROM tag that drifts from
# .nvmrc fails the build here.
COPY .nvmrc /node-version.expected
RUN expected="$(sed 's/^v//' /node-version.expected)" \
 && actual="$(node -p process.versions.node)" \
 && { test "$actual" = "$expected" || { echo "image ships Node $actual, .nvmrc declares $expected"; exit 1; }; }

# The base ships an older CA bundle. 20261020 removes the compromised eMudhra
# intermediates from the OS store; the build fails on an older bundle.
RUN apk --no-cache upgrade \
 && apk --no-cache add tini \
 && bundle="$(apk query --fields version ca-certificates-bundle | sed 's/^Version: //')" \
 && { test "$(apk version -t "$bundle" 20261020-r0)" != "<" || { echo "ca-certificates-bundle $bundle is older than 20261020-r0"; exit 1; }; }

ENV HUSKY=0
WORKDIR /home/node/app
COPY package.json package-lock.json .npmrc ./

FROM base AS development
RUN npm ci --no-audit --cache /tmp/.npm && rm -rf /tmp/.npm
COPY src ./src
# uid 1000 is the base image's `node` user. The app writes no files, so the
# code stays root-owned.
USER 1000
EXPOSE 9091
# Node as PID 1 ignores SIGTERM, so tini runs as PID 1 and forwards it.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/main.js"]

FROM base AS production
RUN npm ci --no-audit --omit=dev --cache /tmp/.npm && rm -rf /tmp/.npm
COPY src ./src
USER 1000
EXPOSE 9091
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/main.js"]
