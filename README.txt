TripBoard 航班自動加入每日行程更新

請上傳並覆蓋 GitHub repository 最外層：
- index.html
- app.js
- service-worker.js

不需要重新上傳 style.css、manifest.json 或任何 icon。

功能：
1. 新增航班時，「自動加入每日行程」預設開啟。
2. 儲存後會在航班出發日期建立一段「飛機」交通。
3. 編輯航班時，行程內的航班交通會同步更新。
4. 刪除航班時，對應的航班交通也會一併刪除。
5. 可取消勾選「自動加入每日行程」，移除該航班的行程交通。
