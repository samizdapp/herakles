FROM node:16-bullseye

RUN mkdir -p /proxy/dist
WORKDIR /proxy

RUN apt-get update
RUN apt-get install inotify-tools miniupnpc -y

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm install


COPY ./watch_hosts.sh ./watch_hosts.sh
COPY ./start.sh ./start.sh
RUN mkdir -p /proxy/src
COPY ./src/p2p_proxy.js ./src/p2p_proxy.js
COPY ./src/upnp.js ./src/upnp.js



CMD [ "sh", "./start.sh" ]