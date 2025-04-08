# Universal-Infra-Manager-2025-Daniel ✨

這是一套全方位整合的現成基礎服務管理平台：

- ✨ Cloudflare Worker 自動部署
- ✨ Cloudflared Web UI Docker 容器，管理 Cloudflare Tunnel
- ✨ GitHub Actions 全自動化部署流程
- ✨ 完整環境變數設定

---

## 工程目錄

```
Universal-Infra-Manager-2025-Daniel/
├── .github/workflows/deploy.yml           # GitHub Actions 部署檔
├── .github/ISSUE_TEMPLATE/bug_report.md   # 問題報告檔
├── cloudflared-web/                       # Cloudflared Web UI Docker 原始碼
├── index.js                               # Cloudflare Worker 主程式
├── package.json                           # NPM 資料檔
├── wrangler.toml                          # Wrangler 設定
├── .env.local                             # 環境變數檔 (自動化用)
└── README.md                              # 工程說明
```

---

## 快速啟動

### 1. 下載頁面

```bash
git clone https://github.com/你的用戶名/Universal-Infra-Manager-2025-Daniel.git
cd Universal-Infra-Manager-2025-Daniel
```

### 2. 設置 `.env.local`

```bash
CF_ACCOUNT_ID=你的-Cloudflare-Account-ID
CF_API_TOKEN=你的-Cloudflare-API-Token
```

### 3. 安裝依賴

```bash
npm install
```

### 4. 手動部署測試

```bash
npm run deploy
```

如有成功，會顯示 URL：

```
https://workerdan.haveanewlife.workers.dev
```

### 5. GitHub Secrets 設置

GitHub Repository > Settings > Secrets and variables > Actions

新增 2 個 Secrets：

- `CF_ACCOUNT_ID` : Cloudflare Account ID
- `CF_API_TOKEN` : Cloudflare API Token

### 6. Push 代碼，觸發自動部署

```bash
git add .
git commit -m "Init Universal-Infra-Manager-2025-Daniel project"
git push origin main
```

成功後，可在 GitHub > Actions 顯示成功流程！

---

## Cloudflared Web UI 使用說明

### 1. 啟動 Docker 容器

```bash
docker run --network host -d -p 14333:14333 wisdomsky/cloudflared-web:latest
```

或使用 docker-compose:

```yaml
services:
  cloudflared:
    image: wisdomsky/cloudflared-web:latest
    restart: unless-stopped
    network_mode: host
    environment:
      WEBUI_PORT: 14333
```

### 2. 打開瀏覽器

```
http://localhost:14333
```

這裡可以設定 Cloudflare Tunnel Token，一鍵啟動或關閉 Tunnel 🎉

---

## GitHub Actions 自動部署

- Push 到 `main` 分支時，自動觸發部署
- 自動讀取 `.env.local` 或 GitHub Secrets
- 部署成功後，Worker 立即生效

> ✨ 全自動化流程，不再需要手動操作!

---

## 未來擴張建議

- ✨ 多服務合併 (如 HA 、 NAS 、 Media Server)
- ✨ 自定義網域：`mingleedan.org`
- ✨ Cloudflare Zero Trust 安全防護
- ✨ 健康檢查與自動通知
- ✨ Docker 自動化管理，搭配 Portainer 或 Watchtower
- ✨ 加入 Cloudflare Tunnel 狀態監控

---

Daniel Dai — 2025 🚀

