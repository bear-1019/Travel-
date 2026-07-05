# TripBoard｜旅行總管 PWA

這是一個可以上傳到 GitHub Pages 的旅行管理 Web App。它可以像 App 一樣加入 iPhone 主畫面，並支援本機儲存；設定 Supabase 後，可以用 Email 登入並在多裝置同步同一份資料。

## 已包含功能

- 旅程總覽 Dashboard
- 航班管理
- 住宿管理
- 每日行程時間軸
- 景點 / 餐廳 / 活動詳細資訊
- 門票、營業時間、最後入場、訂位編號、備註
- 點到點交通段
- 交通方式、路線、轉乘、費用、行李友善度、備案交通
- 行李清單
- 文件與票券
- 預算與支出
- 待辦事項
- 地點庫
- 緊急資訊
- JSON 匯出 / 匯入
- PWA manifest + service worker
- Supabase 手動上傳 / 下載同步

## 檔案結構

```text
tripboard-pwa/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
├── supabase-client.js
├── supabase-config.js
├── supabase-schema.sql
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## 先在電腦本機測試

因為 service worker 和 ES module 通常需要透過 localhost 開啟，不建議直接雙擊 `index.html`。

可以用 Python 啟動：

```bash
cd tripboard-pwa
python3 -m http.server 5173
```

然後打開：

```text
http://localhost:5173
```

## 部署到 GitHub Pages

1. 建立新的 GitHub repository，例如 `tripboard-pwa`
2. 把這個資料夾內所有檔案上傳到 repository 根目錄
3. 到 repository 的 `Settings`
4. 左側選 `Pages`
5. Source 選 `Deploy from a branch`
6. Branch 選 `main`，資料夾選 `/root`
7. 儲存後等待 GitHub 產生網址

網址通常會像：

```text
https://你的帳號.github.io/tripboard-pwa/
```

## 加到 iPhone 主畫面

1. 用 iPhone Safari 打開 GitHub Pages 網址
2. 點底部分享按鈕
3. 選「加入主畫面」
4. 名稱可用 `TripBoard`
5. 新增後，就會像 App 一樣出現在 iPhone 桌面

## 設定 Supabase 多裝置同步

### 1. 建立 Supabase 專案

到 Supabase 建立新專案。

### 2. 建立資料表

進入 Supabase 的 SQL Editor，貼上 `supabase-schema.sql` 的全部內容並執行。

這會建立：

```text
public.tripboard_app_state
```

並啟用 Row Level Security，讓每個登入使用者只能讀寫自己的資料。

### 3. 啟用 Email 登入

到 Supabase：

```text
Authentication → Providers → Email
```

確認 Email provider 已啟用。

### 4. 設定 Site URL

到 Supabase：

```text
Authentication → URL Configuration
```

把 GitHub Pages 網址加入：

```text
Site URL: https://你的帳號.github.io/tripboard-pwa/
Redirect URLs: https://你的帳號.github.io/tripboard-pwa/
```

### 5. 填入 Supabase 設定

打開 `supabase-config.js`，填入：

```js
window.TRIPBOARD_SUPABASE_URL = "你的 Project URL";
window.TRIPBOARD_SUPABASE_ANON_KEY = "你的 anon/public key";
```

注意：只能貼 `anon/public` key，不要貼 `service_role` key。

### 6. 使用同步

打開 App → `同步設定`：

1. 輸入 Email
2. 點「寄送登入連結」
3. 到信箱點登入連結
4. 回到 App
5. 點「上傳目前資料到雲端」
6. 另一台裝置登入同一個 Email 後，點「從雲端下載到這台裝置」

## 為什麼同步是手動？

V1 採用手動同步，避免兩台裝置同時修改時互相覆蓋。之後如果要做 V2，可以改成：

- 自動同步
- 版本衝突提示
- 旅伴共享權限
- 每個資料表獨立同步
- 附件上傳 Supabase Storage

## V1 限制

- 目前文件附件以「連結」方式保存，例如 Google Drive、iCloud、票券網址
- 尚未內建地圖 API，因此交通時間需要手動填
- 尚未做多人共同編輯權限
- 雲端同步是整份 JSON 狀態，不是每個表格分開同步

## 建議下一版

- 旅伴邀請與共享權限
- Supabase Storage 上傳 PDF / QR Code 圖片
- 匯出 PDF 行程表
- 地點地圖視覺化
- 離線編輯後自動合併
- 天氣與交通 API 整合
- update google sync config
- update 0705
