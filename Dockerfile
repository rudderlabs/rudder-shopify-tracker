FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS base

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