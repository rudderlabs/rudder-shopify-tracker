FROM node:20-alpine@sha256:1ab6fc5a31d515dc7b6b25f6acfda2001821f2c2400252b6cb61044bd9f9ad48

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Bundle app source
COPY . .
RUN rm -rf /usr/src/app/node_modules

RUN npm ci --no-audit --cache .npm
# If you are building your code for production
# RUN npm ci --only=production

# EXPOSE 9091
CMD [ "npm", "run", "start" ]