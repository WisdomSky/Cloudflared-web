FROM debian:stable-slim

ARG CACHEBUST=1

WORKDIR /var/app

USER root

RUN apt update && \
apt upgrade && \
apt install curl -y

RUN apt install -f nodejs npm -y
RUN npm cache clean -f
RUN npm install -g n
RUN n 18

RUN curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && dpkg -i cloudflared.deb

VOLUME /config

COPY app/backend /var/app/backend
COPY app/frontend /var/app/frontend

RUN cd /var/app/frontend && npm install && npm run build

RUN cd /var/app/backend && npm install

ENTRYPOINT node /var/app/backend/app.js
