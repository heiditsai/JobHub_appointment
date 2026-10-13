# JobHub_appointment

AI 小助手對話式前台 prototype（對標 ChatGPT／Claude 介面）。Vite + React 19 + TypeScript，樣式用 Tailwind Play CDN，theme 對齊 MAYO UI 3.0 APOLLO Foundations。

## 功能

- 左側 Sidebar 可收合（桌面收成 icon rail、行動版為 overlay），收合狀態會記住
- **新對話**：開空白對話（`⌘⇧O`），送出第一則訊息後才進入歷程
- **對話歷程**：依今天／昨天／過去 7 天／過去 30 天／更早分組，可搜尋、重新命名、刪除
- 對話區：逐字串流回覆、停止、複製、重新產生；Enter 送出、Shift+Enter 換行
- AI 回覆為前端假資料（`src/pages/chat/aiChatMock.ts`），不打真 API

## 指令

```bash
npm install
npm run dev     # http://localhost:5190
npm run build
npm run scan    # APOLLO Foundations 違規掃描
```

`public/tailwind-theme.js`、`public/theme-vars.css` 複製自 apollo-enterprise-portal-shell 的 theme 產出，勿手改。
