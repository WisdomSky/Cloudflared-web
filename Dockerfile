FROM node:18-bookworm-slim

ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

ARG CLOUDFLARED_VERSION=2024.2.1
ARG CLOUDFLARED_BASE_URL="https://github.com/cloudflare/cloudflared/releases/download"

ENV VERSION=$CLOUDFLARED_VERSION
ENV WEBUI_PORT=${WEBUI_PORT:-14333}

EXPOSE ${WEBUI_PORT}

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

COPY app/backend /var/app/backend
COPY app/frontend /var/app/frontend

RUN cd /var/app/frontend && npm install && npm run build
RUN cd /var/app/backend && npm install

ENTRYPOINT node /var/app/backend/app.js
