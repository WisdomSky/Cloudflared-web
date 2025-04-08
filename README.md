# Cloudflared-web + Cloudflare Worker 自動部署整合專案 🚀

這是一個完整的整合專案，包含：
- ✅ Cloudflare Worker 自動部署
- ✅ Cloudflared Web UI Docker 容器，管理 Cloudflare Tunnel
- ✅ GitHub Actions 自動化部署流程
- ✅ 完整環境變數設定

---

## 專案結構

```
Cloudflared-web/
├── .github/workflows/deploy.yml      # GitHub Actions 自動部署
├── cloudflared-web/                  # Docker Cloudflared Web UI 原始碼
├── index.js                          # Cloudflare Worker 程式碼
├── package.json                      # NPM 腳本和依賴
├── wrangler.toml                     # Cloudflare Wrangler 設定
├── .env.local                        # 部署用環境變數
└── README.md                         # 專案說明文件
```

---

## 快速啟動

### 1. 下載專案

```bash
git clone https://github.com/你的用戶名/Cloudflared-web.git
cd Cloudflared-web
```

### 2. 建立 `.env.local`，填入你的帳號資訊：

```bash
CF_ACCOUNT_ID=你的-Cloudflare-Account-ID
CF_API_TOKEN=你的-Cloudflare-API-Token
```

### 3. 安裝依賴

```bash
npm install
```

### 4. 手動部署一次測試：

```bash
npm run deploy
```

部署成功後，Cloudflare 會顯示網址：

```
https://workerdan.haveanewlife.workers.dev
```

### 5. 設定 GitHub Secrets（自動部署必做）

到 GitHub Repository > Settings > Secrets and variables > Actions：

新增兩個 Secret：
- `CF_ACCOUNT_ID`：你的 Cloudflare Account ID
- `CF_API_TOKEN`：你的 Cloudflare API Token

### 6. 推送代碼觸發自動部署！

```bash
git add .
git commit -m "Init Cloudflare Worker + Cloudflared Web UI project"
git push origin main
```

完成後，前往 GitHub > Actions 頁面，確認部署流程是否成功 ✅

---

## Cloudflared Web UI 使用說明

### 1. 啟動容器

```bash
docker run --network host -d -p 14333:14333 wisdomsky/cloudflared-web:latest
```

或使用 `docker-compose.yml`：

```yaml
services:
  cloudflared:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    environment:
      WEBUI_PORT: 14333
```

### 2. 開啟瀏覽器

進入以下網址：

```
http://localhost:14333
```

這裡可以設定 Cloudflare Tunnel token，並一鍵開啟或關閉 Tunnel 🎉

---

## GitHub Actions 自動部署

- 當你 push 到 `main` 分支時，自動觸發部署流程。
- 自動讀取 `.env.local` 或 GitHub Secrets，完成 Worker 部署。
- 部署成功後，Cloudflare Worker 立即生效。

> ✅ 完整自動化流程，不再需要手動部署！

---

## 未來擴展建議

- ✅ 多服務整合（HA、NAS、Media Server 等）
- ✅ 自訂域名：mingleedan.org
- ✅ Cloudflare Zero Trust 安全防護
- ✅ 健康檢查與自動通知
- ✅ Docker 自動化管理，搭配 Portainer 或 Watchtower
- ✅ 加入 Cloudflare Tunnel 狀態監控

---

Daniel Dai — 2025 🚀

