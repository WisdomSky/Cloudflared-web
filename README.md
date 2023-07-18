    sudo docker buildx build --platform linux/amd64,linux/arm64 -t wisdomsky/casaos-cloudflared:latest -t wisdomsky/casaos-cloudflared:1.0 --push .
