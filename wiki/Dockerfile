FROM node:18-alpine

WORKDIR /usr/src/athena


RUN apk add jq inotify-tools bash
RUN npm install -g wiki
COPY ./start.sh .

CMD ["/bin/bash", "/usr/src/athena/start.sh"]