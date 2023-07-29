FROM debian:stable-slim

ARG TARGETPLATFORM
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

WORKDIR /var/app

USER root

RUN apt update && \
apt upgrade && \
apt install curl -y

RUN apt install -f nodejs npm -y
RUN npm cache clean -f
RUN npm install -g n
RUN n 18


RUN if [ "$TARGETVARIANT" = "v7" ] ; then \
    curl -L --output cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/download/2023.7.3/cloudflared-$TARGETOS-${TARGETARCH}hf.deb" && dpkg -i cloudflared.deb; \
  else \
    curl -L --output cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/download/2023.7.3/cloudflared-$TARGETOS-$TARGETARCH.deb" && dpkg -i cloudflared.deb; \
  fi


VOLUME /config

COPY app/backend /var/app/backend
COPY app/frontend /var/app/frontend

RUN cd /var/app/frontend && npm install && npm run build

RUN cd /var/app/backend && npm install

ENTRYPOINT node /var/app/backend/app.js
