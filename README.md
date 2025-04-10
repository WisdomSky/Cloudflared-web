# SkyRoute-Enterprise

🚀 SkyRoute-Enterprise 企業級自動化平台

目前專案已整合：

✅ GitHub Actions 自動部署
✅ 基礎路由處理（含主頁 / 路由）
✅ Cloudflare 全球邊緣網路部署
✅ Docker 多平台映像，GHCR 自動推送

## 功能介紹

- 多平台編譯：`linux/amd64`, `linux/arm64`, `linux/armhf`
- 自動生成版本號：版本號 + 日期 + Git Commit Hash
- 自動三 tag：版本 tag / 企業級 tag / latest
- 自動部署至 Cloudflare Worker
- 自動推送 Docker 映像至 GitHub Container Registry

## TODO (持續優化中)

- [ ] 自動健康檢查回報
- [ ] 整合 webhook 通知（LINE Notify / Telegram）
- [ ] 鏡像失效自動重建
- [ ] 完成每日定時 build
