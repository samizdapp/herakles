# note: never use the :latest tag in a production site
FROM caddy:latest


WORKDIR /app
RUN apk add jq

COPY ./Caddyfile.header ./Caddyfile.header
COPY ./Caddyfile.footer ./Caddyfile.footer
COPY ./start.sh ./start.sh

ENTRYPOINT ["sh","./start.sh"]