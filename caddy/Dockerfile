# note: never use the :latest tag in a production site
FROM caddy:2.6.1-alpine


WORKDIR /app
RUN apk add jq ruby-mustache
RUN gem install mustache

COPY ./Caddyfile.mustache ./Caddyfile.mustache
COPY ./start.sh ./start.sh

ENTRYPOINT ["sh","./start.sh"]