# SkyRoute-Enterprise

🚀 SkyRoute-Enterprise is an enterprise-grade automation platform designed to simplify and optimize the management of Cloudflare tunnels. It combines the power of the Cloudflare CLI (cloudflared) with a modern, intuitive Web UI, enabling seamless deployment and management of tunnels across Cloudflare's global edge network.

![Build Status](https://img.shields.io/github/actions/workflow/status/Danieltheflukr/SkyRoute-Enterprise/main.yml?branch=main)
![Docker Pulls](https://img.shields.io/docker/pulls/Danieltheflukr/skyroute-enterprise)
![License](https://img.shields.io/github/license/Danieltheflukr/SkyRoute-Enterprise)
![Last Commit](https://img.shields.io/github/last-commit/Danieltheflukr/SkyRoute-Enterprise)

## Table of Contents

1.  [Key Features](#key-features)
2.  [Architecture Diagram](#architecture-diagram)
3.  [Getting Started](#getting-started)
4.  [Upcoming Improvements (TODO)](#upcoming-improvements-todo)
5.  [Contributing](#contributing)
6.  [License](#license)
7.  [FAQs](#faqs)
8.  [Contact](#contact)

---

## Key Features

* **Multi-Platform Support**:
    * Compatible with `linux/amd64`, `linux/arm64`, and `linux/armhf`.
* **Automated Deployment Pipeline**:
    * Integrated with GitHub Actions for CI/CD.
    * Automatically generates version tags combining version numbers, dates, and Git commit hashes.
    * Deploys to Cloudflare Workers for edge computing.
* **Dynamic Tagging**:
    * Generates three automatic tags:
        * Version-specific tag
        * Enterprise-grade tag
        * `latest` tag
* **Cloudflare API Integration**:
    * Supports dynamic API interactions via the associated Cloudflare Worker, such as:
        * Token verification (`verifyToken`)
        * Listing tunnels (`listTunnels`)
        * Managing certificates (`listCertificates`) and access applications (`listAccessApps`)
* **Docker Image Management**:
    * Automatically builds and pushes Docker images to GitHub Container Registry.
* **Scheduled Tasks**:
    * Automates daily builds using cron triggers (as configured in GitHub Actions).
* **Web UI**:
    * Provides an intuitive interface for managing tunnels (accessible locally by default).

---

## Architecture Diagram

*(Placeholder for your architecture diagram)*
*Add your architecture diagram link here when available.*

---

## Getting Started

### Prerequisites

| Software         | Minimum Version | Notes                             |
|------------------|-----------------|-----------------------------------|
| Docker           | `>= 20.10`      | Required to build and run images. |
| Docker Compose   | `>= 1.29`       | Required to use `docker-compose`. |
| Cloudflare Account | -               | Needed for API tokens & Workers.  |
| Node.js          | `>= 16.x`       | (Optional) For local development. |

### Steps to Run

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Danieltheflukr/SkyRoute-Enterprise.git](https://github.com/Danieltheflukr/SkyRoute-Enterprise.git)
    cd SkyRoute-Enterprise
    ```
2.  **Configure Environment (if necessary):**
    * You might need to set up a `.env` file based on `.env.example` if required by `docker-compose.yml`.
3.  **Build and run the application:**
    ```bash
    docker-compose up --build -d
    ```
    * Use `-d` to run in detached mode (in the background).
4.  **Access the Web UI:**
    * Navigate to `http://localhost:8080` (or the port configured in `docker-compose.yml`) in your browser.

---

## Upcoming Improvements (TODO)

* **Automated Health Check Reports**:
    * Implement periodic health monitoring for deployed services and report status.
* **Webhook Notifications**:
    * Integrate with LINE Notify and Telegram for real-time updates on deployments, health status, etc.
* **Auto-Rebuild Expired Images**:
    * Automatically detect and rebuild base Docker images upon expiration.
* **Enhanced Build Scheduling**:
    * Refine and finalize infrastructure for daily or other scheduled builds.

---

## Contributing

We welcome contributions to improve SkyRoute-Enterprise! To get started:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature` or `bugfix/YourBugfix`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/YourFeature`).
6.  Open a Pull Request with a detailed explanation of your changes.

---

## License

SkyRoute-Enterprise is released under the MIT License. See the `LICENSE` file for details.

---

## FAQs

**Q: What is SkyRoute-Enterprise?**
A: SkyRoute-Enterprise is an automation platform built around a Docker image combining the Cloudflare CLI (`cloudflared`) with a Web UI, designed to simplify Cloudflare tunnel management and deployment, often integrated with Cloudflare Workers.

**Q: Where can I access the Web UI?**
A: After running the application using `docker-compose up`, you can typically access it locally at `http://localhost:8080`, unless the port is configured differently.

**Q: How is the Cloudflare Worker related?**
A: The Cloudflare Worker (code provided in previous examples) often acts as the public-facing API endpoint or proxy, interacting with the Cloudflare API and potentially routing requests to services exposed via tunnels managed by SkyRoute-Enterprise components.

---

## Contact

For questions or support, feel free to reach out:

* **Author**: Danieltheflukr
* **Issues**: Please submit any bugs or feature requests via [GitHub Issues](https://github.com/Danieltheflukr/SkyRoute-Enterprise/issues).