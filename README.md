# Cloudflared-web

_Cloudflared-web packages both cloudflare tunnel and a simple web-based user interface for easy starting and stopping of cloudflare tunnel._

--- 
## Application Setup
When manually setting up this image, it is crucial to always set the `networking mode` into `host` as without it, the cloudflared service won't be able to access the services running on the host:

    docker run --network host wisdomsky/cloudflared-web:latest 

or if through `docker-compose.yml`:

via docker.io:
```yaml
services:
  app:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - /path/to/config:/config #optional
```
via ghcr.io:
```yaml
services:
  app:
    image: ghcr.io/wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - /path/to/config:/config #optional
```

The Web UI where you can setup the cloudflared token can be accessed from port `14333`:

    http://localhost:14333

---
## Screenshots
<!---
![Screenshot 1](https://raw.githubusercontent.com/WisdomSky/Casaos-Appstore/main/Apps/Cloudflared/screenshot-1.png)
--->
![Screenshot 2](https://raw.githubusercontent.com/WisdomSky/Casaos-Appstore/main/Apps/Cloudflared/screenshot-2.png)

![Screenshot 3](https://raw.githubusercontent.com/WisdomSky/Casaos-Appstore/main/Apps/Cloudflared/screenshot-3.png)

---

## Frequently Asked Questions

#### How to temporarily stop the cloudflare tunnel.

1. Go to the cloudflared app WebUI via http://localhost:14333.
2. Click "Remove Service".
3. Stop the container.

### How to restart the cloudflare tunnel.

1. Start the container.
2. Go to the cloudflared app WebUI via http://localhost:14333.
3. Click "Install Service".

---

## Troubleshooting

#### Cloudflare tunnel does not work after restarting Docker

* Re-install cloudflare service through the WebUI (http://localhost:14333), click Remove Service and then click Install Service.

#### Cloudflare tunnel does not work after stopping and then restarting the container

* Re-install cloudflare service through the WebUI (http://localhost:14333), click Remove Service and then click Install Service.
