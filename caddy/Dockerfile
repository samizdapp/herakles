# note: never use the :latest tag in a production site
FROM caddy:latest

COPY . .
RUN apk add jq

ENTRYPOINT ["./start.sh"]