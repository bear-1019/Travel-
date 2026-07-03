# TripBoard Google Sheets 共享碼同步設定

這個版本不用 Supabase。你需要建立一個 Google Sheet + Google Apps Script Web App。

## 1. 建立 Google Sheet

1. 開一個新的 Google 試算表。
2. 命名為 `TripBoard Cloud`。
3. 從網址複製 Spreadsheet ID。ID 是 `/d/` 和 `/edit` 中間那一串。

## 2. 建立 Apps Script

1. 在 Google Sheet 上方選：Extensions / 擴充功能 → Apps Script。
2. 刪掉原本內容。
3. 貼上 `google-apps-script-code.gs` 的全部內容。
4. 把第一行 `PASTE_YOUR_GOOGLE_SHEET_ID_HERE` 換成你的 Spreadsheet ID。
5. 儲存。

## 3. 初始化資料表

1. 在 Apps Script 上方函式選單選 `setup`。
2. 按 Run。
3. 第一次會要求授權，照畫面允許。

## 4. 部署 Web App

1. 右上角 Deploy → New deployment。
2. Select type 選 Web app。
3. Execute as 選 Me。
4. Who has access 選 Anyone。
5. Deploy。
6. 複製 Web app URL，通常會以 `/exec` 結尾。

## 5. 填入 TripBoard

1. 回 GitHub repo 打開 `google-sync-config.js`。
2. 把 `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` 換成你的 Web app URL。
3. Commit changes。
4. 等 GitHub Pages 重新部署。

## 6. 使用方式

你和旅伴都打開同一個 TripBoard 網址：

1. 進入同步設定。
2. 輸入同一組共享碼，例如 `PARIS2026`。
3. 輸入同一組 PIN，例如 `1019`。
4. 輸入各自暱稱。
5. 修改資料後按「儲存到共享雲端」。
6. 另一台裝置按「從共享雲端載入」。

注意：這不是即時同步。後上傳的資料會覆蓋雲端資料。
