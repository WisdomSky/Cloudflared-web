FROM node:18-bookworm-slim

ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

ARG CLOUDFLARED_VERSION=2023.8.2
ARG CLOUDFLARED_BASE_URL="https://github.com/cloudflare/cloudflared/releases/download"

ENV WEBUI_PORT=${WEBUI_PORT:-14333}

USER root
WORKDIR /var/app

RUN apt update && apt upgrade && apt install curl -y

RUN if [ "$TARGETVARIANT" = "v7" ]; then \
        CLOUDFLARED_PKG="cloudflared-$TARGETOS-${TARGETARCH}hf.deb"; \
    else \
        CLOUDFLARED_PKG="cloudflared-$TARGETOS-$TARGETARCH.deb"; \
    fi && \
    curl -L --output cloudflared.deb "$CLOUDFLARED_BASE_URL/$CLOUDFLARED_VERSION/$CLOUDFLARED_PKG" && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

VOLUME /config

VOLUME /var/app/backend
VOLUME /var/app/frontend

