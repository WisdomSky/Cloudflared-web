# Cloudflared-web

_Cloudflared-web is a docker image that packages both cloudflared cli and a no-frills Web UI for easy starting/stopping of cloudflare tunnel._

https://hub.docker.com/r/wisdomsky/cloudflared-web

---

## Why use `Cloudflared-web`?

#### Pros

✅ Only need to run a docker command once. No need to run docker commands everytime you want to start or stop the container or when updating the token.

✅ Start and stop cloudflare tunnel anytime with a single click.

#### Cons

❌ Only supports Cloudflare Tunnel.

❌ Can only update hostname policies through the [ZeroTrust](https://one.dash.cloudflare.com/) dashboard.


--- 
## Application Setup
When manually setting up this image, it is crucial to always set the `networking mode` into `host` as without it, the cloudflared service won't be able to access the services running on the host:

    docker run --network host wisdomsky/cloudflared-web:latest

or if using `docker-compose.yml`:

```yaml
services:
  cloudflared:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
```

The Web UI where you can setup the Cloudflared token can be accessed from port `14333`:

    http://localhost:14333

### Github Containers

If for some reason you are unable to pull images from Docker's Official Image Registry (docker.io), `Cloudflared-web` is also synced to Github Container Registry (ghcr.io).

Just prefix the image with `ghcr.io/` in order to use the mirrored image in Github.
```yaml
services:
  cloudflared:
    image: ghcr.io/wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
```


---
## Additional Parameters

### Environment
| Variable Name | Default value | Required or Optional | Description |
|---|---|---|---|
| WEBUI_PORT | 14333 | _Optional_ | The port on the host where the WebUI will be running. Useful when an existing process is running on port `14333` and want to assign cloudflared-web into a different available port. |

example `docker-compose.yaml`:
```yaml
services:
  cloudflared:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    environment:
      WEBUI_PORT: 1111
```


### Volume
| Container Path | Required or Optional | Description |
|---|---|---|
| /config | _Optional_ | The path to the directory where the `config.json` file containing the Cloudflare token and start status will be saved.  |

example `docker-compose.yaml`:
```yaml
services:
  cloudflared:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - /mnt/storage/cloudflared/config:/config
```


## Screenshots

![Screenshot 1](https://raw.githubusercontent.com/WisdomSky/Cloudflared-web/main/screenshot-1.png)

![Screenshot 2](https://raw.githubusercontent.com/WisdomSky/Cloudflared-web/main/screenshot-2.png)

---

## Issues

For any problems experienced while using the docker image, please submit a new issue to:
https://github.com/WisdomSky/Cloudflared-web/issues

---

Last build on 01-29-2024