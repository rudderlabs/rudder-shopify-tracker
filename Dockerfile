FROM node:20-alpine@sha256:658d0f63e501824d6c23e06d4bb95c71e7d704537c9d9272f488ac03a370d448 AS base

ENV HUSKY=0

RUN apk update && apk upgrade

FROM base AS development
ENV HUSKY=0

USER node

# Create app directory
WORKDIR /home/node/app
RUN chown -R node:node /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY .npmrc ./

# Bundle app source
COPY --chown=node:node . .

RUN npm ci --no-audit --cache .npm

# EXPOSE 9091
CMD [ "npm", "run", "start" ]

FROM base AS production
ENV HUSKY=0

USER node

WORKDIR /home/node/app
RUN chown -R node:node /home/node/app

COPY package*.json ./
COPY .npmrc ./

COPY --chown=node:node . .

RUN npm ci --no-audit --cache .npm --omit=dev

CMD [ "npm", "run", "start" ]