FROM node:alpine

RUN mkdir -p /usr/src/app
ENV PORT 3000

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/

RUN npm install 

COPY public /usr/src/app/public
COPY types /usr/src/app/types
COPY styles /usr/src/app/styles
COPY next.config.js tsconfig.json next-env.d.ts /usr/src/app/
COPY pages /usr/src/app/pages
COPY worker /usr/src/app/worker
COPY layouts /usr/src/app/layouts
COPY components /usr/src/app/components

RUN npm run build

CMD [ "npm", "run", "start" ]