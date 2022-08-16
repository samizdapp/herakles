# FROM docker.io/golang:alpine as builder

# COPY yggdrasil /src
# WORKDIR /src

# ENV CGO_ENABLED=0

# # Support specifying package version
# ARG PKGVER
# ENV PKGVER $PKGVER

# RUN apk add git && ./build && go build -o /src/genkeys cmd/genkeys/main.go

FROM docker.io/alpine

# COPY --from=builder /src/yggdrasil /usr/bin/yggdrasil
# COPY --from=builder /src/yggdrasilctl /usr/bin/yggdrasilctl
# COPY --from=builder /src/genkeys /usr/bin/genkeys
COPY entrypoint.sh /usr/bin/entrypoint.sh
COPY watch.sh /usr/bin/watch.sh
COPY upnp.sh /usr/bin/upnp.sh
COPY testhost /shared_etc/yg_hosts

# RUN addgroup -g 1000 -S yggdrasil-network \
#  && adduser -u 1000 -S -g 1000 --home /etc/yggdrasil-network yggdrasil-network
#
# USER yggdrasil-network
# TODO: Make running unprivileged work

RUN apk add nano jq procps miniupnpc bash

VOLUME [ "/etc/yggdrasil-network" ]

ENTRYPOINT [ "/usr/bin/entrypoint.sh" ]