FROM node:18-bookworm-slim

ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

ARG CLOUDFLARED_VERSION=2024.8.3
ARG CLOUDFLARED_BASE_URL="https://github.com/cloudflare/cloudflared/releases/download"

ENV VERSION=$CLOUDFLARED_VERSION
ENV WEBUI_PORT=${WEBUI_PORT:-14333}
ENV METRICS_ENABLE=${METRICS_ENABLE:-"false"}
ENV METRICS_PORT=${METRICS_PORT:-60123}


EXPOSE ${WEBUI_PORT}
EXPOSE ${METRICS_PORT}

USER root
WORKDIR /var/app

RUN apt update && apt upgrade -y && apt install -y curl

RUN if [ "$TARGETVARIANT" = "v7" ]; then \
        CLOUDFLARED_PKG="cloudflared-$TARGETOS-${TARGETARCH}hf.deb"; \
    else \
        CLOUDFLARED_PKG="cloudflared-$TARGETOS-$TARGETARCH.deb"; \
    fi && \
    curl -L --output cloudflared.deb "$CLOUDFLARED_BASE_URL/$CLOUDFLARED_VERSION/$CLOUDFLARED_PKG" && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

VOLUME /root/.cloudflared
VOLUME /config

VOLUME /var/app/backend
VOLUME /var/app/frontend

