#!/bin/bash

sudo docker buildx build --platform linux/amd64,linux/arm64,linux/armhf -t wisdomsky/casaos-cloudflared:latest -t wisdomsky/casaos-cloudflared:2023.7.3 --push .