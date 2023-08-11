# discord-music-bot installation
FROM node:lts-alpine as install
WORKDIR /usr/src/app
COPY . ./
RUN npm install

# discord-music-bot start
ENTRYPOINT [ "npm" , "run" , "start" ]