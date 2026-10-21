# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# check=error=true

FROM node:24.22.1-alpine3.24@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS base

# .nvmrc is the one Node version source. A digest pins content, not a version,
# so only the binary proves which Node shipped. A FROM tag that drifts from
# .nvmrc fails the build here.
COPY .nvmrc /node-version.expected
RUN expected="$(sed 's/^v//' /node-version.expected | tr -d '[:space:]')" \
 && actual="$(node -p process.versions.node)" \
 && { test "$actual" = "$expected" || { echo "image ships Node $actual, .nvmrc declares $expected"; exit 1; }; }

# Node uses its own bundled CA store, so the Node version above protects the
# app. The OS store serves wget, apk and any tool that reads it. The base ships
# an older bundle; 20261020 removes the compromised eMudhra intermediates. The
# build fails on an older bundle, and when apk cannot report the version.
RUN apk --no-cache upgrade \
 && apk --no-cache add tini \
 && bundle="$(apk query --fields version ca-certificates-bundle)" \
 && bundle="${bundle#Version: }" \
 && cmp="$(apk version -t "$bundle" 20261020-r0)" \
 && case "$cmp" in "="|">") ;; *) echo "ca-certificates-bundle '$bundle' is not 20261020-r0 or newer"; exit 1;; esac

ENV HUSKY=0
WORKDIR /home/node/app
COPY package.json package-lock.json .npmrc ./

FROM base AS development
# uid 1000 is the base image's `node` user. The development image keeps the
# tree writable for it, as before, so nodemon and npm work inside it.
RUN chown -R 1000:1000 /home/node/app
USER 1000
RUN npm ci --no-audit --cache /tmp/.npm && rm -rf /tmp/.npm
COPY --chown=1000:1000 src ./src
EXPOSE 9091
# Node as PID 1 ignores SIGTERM, so tini runs as PID 1 and forwards it.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/main.js"]

FROM base AS production
RUN npm ci --no-audit --omit=dev --cache /tmp/.npm && rm -rf /tmp/.npm
COPY src ./src
# The app writes no files, so the production code stays root-owned.
USER 1000
EXPOSE 9091
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/main.js"]
