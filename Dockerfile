FROM node:16.20.2-bookworm-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Bundle app source
COPY . .
RUN rm -rf /usr/src/app/node_modules

RUN npm install --only=prod
# If you are building your code for production
# RUN npm ci --only=production

# EXPOSE 9091
CMD [ "npm", "run", "start" ]