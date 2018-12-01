ARG NODE_VERSION=8-alpine
FROM node:${NODE_VERSION}

ENV node_env=development

RUN pip install youtube-dl

RUN apt install vlc

RUN docker pull redis

RUN apk update && apk upgrade && apk add --no-cache git

RUN npm i -g npm@latest

WORKDIR /usr/src/api

COPY package.json  ./
COPY packages ./packages

RUN npm install

COPY . .

RUN cp .env.example .env

RUN npm run tsc

RUN npm run parse

RUN redis-server

# Define environment variables
ENV PLAYER vlc
ENV YOUTUBE_DL youtube-dl

EXPOSE 3000
CMD [ "npm", "start" ]
