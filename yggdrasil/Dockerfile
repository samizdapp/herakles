FROM docker.io/golang:alpine as builder

COPY router /src
WORKDIR /src

ENV CGO_ENABLED=0

# Support specifying package version
ARG PKGVER
ENV PKGVER $PKGVER

RUN apk add git && ./build && go build -o /src/genkeys cmd/genkeys/main.go

FROM docker.io/alpine

COPY --from=builder /src/yggdrasil /usr/bin/yggdrasil
COPY --from=builder /src/yggdrasilctl /usr/bin/yggdrasilctl
COPY --from=builder /src/genkeys /usr/bin/genkeys

# RUN addgroup -g 1000 -S yggdrasil-network \
#  && adduser -u 1000 -S -g 1000 --home /etc/yggdrasil-network yggdrasil-network
#
# USER yggdrasil-network
# TODO: Make running unprivileged work

RUN apk add nano jq procps miniupnpc bash inotify-tools curl bind-tools 
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

COPY crawler /crawler
WORKDIR /crawler

RUN pip3 install -r requirements.txt

COPY status.sh /usr/bin/status.sh
COPY entrypoint.sh /usr/bin/entrypoint.sh
COPY run.sh /usr/bin/run.sh

VOLUME [ "/etc/yggdrasil-network" ]

ENTRYPOINT [ "/bin/bash","/usr/bin/entrypoint.sh" ]