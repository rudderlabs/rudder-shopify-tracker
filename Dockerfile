# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# check=error=true

FROM node:24.22.2-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS base

# Node uses its own bundled CA store. The OS store serves wget, apk and any
# tool that reads it. The base ships an older bundle; 20261020 removes the
# compromised eMudhra intermediates. apk refuses the install when no bundle
# at or above that version is available.
RUN apk --no-cache upgrade \
 && apk --no-cache add tini 'ca-certificates-bundle>=20261020'

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
