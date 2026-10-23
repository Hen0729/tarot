# 偉特塔羅 · 抽牌與筆記

單機優先的偉特塔羅工具：抽牌、牌陣擺法、個人牌義、牌面圖、紀錄筆記，並可透過 Firebase 在兩台裝置間同步。

## 使用方式

```bash
npx --yes serve .
```

或直接用瀏覽器開啟 `index.html`。

## 目錄

| 路徑 | 說明 |
|------|------|
| `index.html` | 頁面骨架 |
| `css/styles.css` | 樣式 |
| `js/config.js` | Firebase 共用帳號設定 |
| `js/core.js` | 牌資料、本機儲存、牌庫與基本抽牌 |
| `js/spreads.js` | 牌陣擺法、自訂牌陣、紀錄列表 |
| `js/ai.js` | 統整解析（需 Claude bridge） |
| `js/sync.js` | Firebase 雲端同步 |

## 注意

- 此專案設計為**兩人共用同一組雲端帳號**，請將 repo 設為 **private**。
- AI 統整解析依賴環境中的 `window.claude`；一般瀏覽器會改為本機牌義彙整。
