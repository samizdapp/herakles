FROM alpine:latest

RUN apk --no-cache add miniupnpc bind-tools

COPY update.sh .
RUN chmod +x ./update.sh

ENTRYPOINT [ "./update.sh" ]