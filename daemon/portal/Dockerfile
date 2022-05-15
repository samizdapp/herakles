FROM node:alpine

RUN mkdir -p /usr/src/app
ENV PORT 3000

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

RUN yarn install 

COPY public /usr/src/app/public
COPY types /usr/src/app/types
COPY styles /usr/src/app/styles
COPY next.config.js tsconfig.json next-env.d.ts /usr/src/app/
COPY worker /usr/src/app/worker
COPY pages /usr/src/app/pages

RUN yarn build

CMD [ "yarn", "start" ]