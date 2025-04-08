# Cloudflared Web Worker

用於 Raspberry Pi 多服務代理的 Cloudflare Worker

通過 Cloudflare Tunnel 安全公開內部服務，例如 Home Assistant、媒體伺服器 (Jellyfin)、NAS (OpenMediaVault) 等。

## 功能

- ✅ 多服務代理（/ha, /media, /nas）
- ✅ Cloudflare Tunnel 安全公開
- ✅ 自動化部署（GitHub → Cloudflare Worker）
- ✅ 安全 Header 強化 + CORS 支援

## 專案結構

```
Cloudflared-web/
├── index.js         # Worker 主要程式碼
├── package.json     # NPM 腳本與設定檔
└── wrangler.toml    # Cloudflare 部署設定檔
```

## 快速開始

### 1. 安裝 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 設定 Cloudflare 帳號

編輯 `wrangler.toml`：

```toml
account_id = "你的 Cloudflare 帳號 ID"
routes = ["https://mingleedan.org/*"]
```

> `account_id` 可以在 Cloudflare Dashboard → Workers → Settings 找到。

### 3. 部署

```bash
npm run deploy
```

### 4. 開發模式測試

```bash
npm run dev
```

## 擴展服務

修改 `index.js`，新增更多代理服務：

```javascript
else if (url.pathname.startsWith("/你的服務路徑")) {
  url.hostname = "mingleedan.org";
  url.port = "對應的服務端口";
  url.pathname = url.pathname.replace("/你的服務路徑", "");
}
```

## 常見問題

- **如何查看部署記錄？**
  Cloudflare Dashboard → Workers → Deployments

- **Tunnel 無法連線？**
  確認 `cloudflared` 是否在線，並檢查 Pi 的防火牆規則。

- **是否支援 HTTPS？**
  是的！透過 Cloudflare 自動配置 SSL/TLS。

## 推薦配套

- Raspberry Pi + Docker
- Cloudflare Zero Trust (IP Access Rules)
- Docker 管理工具 (Portainer)
- 日誌監控 (Cloudflare Logpush / Workers Analytics)

---

Daniel Dai 製作 ☁️
2025.04 🚀
