# PM 指南 — 用 AI Agent VibeCoding

寫給**非工程師**。你不需要懂程式，只要會：起站、看畫面、用一句話請 Agent 幫你加功能、確認綠燈。

## 一次性準備

1. 安裝 **Docker Desktop** 並打開。
2. 安裝一個 AI Coding Agent（例如 Claude Code）。
3. 用 Agent 開啟這個專案資料夾。

## 每天的循環

### 1) 起站
跟 Agent 說：
> 幫我把專案跑起來。

它會執行 `make dev`。完成後打開 **http://localhost:3000**，先到 `/register` 註冊一個帳號。

開發時有兩個 Web 入口：

- **http://localhost:3000**：Vite 開發入口，改畫面會熱更新，日常開發優先用這個。
- **http://localhost:8000**：Django 同網域入口，模擬 stage/prod；同一個網址下有 Web、`/api/v1/` 和 `/admin/`。

### 2) 確認系統健康
> 確認系統健康狀態。

它會跑 `make dev-health`，看到 `"status":"ok"` 就代表後端、資料庫、Redis 都正常。

### 後台在哪裡

後台入口是 **http://localhost:8000/admin/**。這不是工程師除錯頁，而是給案主/營運使用的管理後台，模板預設使用較現代且支援 RWD 的 Django Admin UI。請 Agent 新增資料功能時，也要同步把後台做成繁體中文、可搜尋、可篩選、好理解的管理介面。

### 3) 加功能（重點）
用「**做什麼**」描述，不要管「怎麼做」。例如：

> 幫我加一個「客戶」功能：可以新增客戶，填姓名、電話、Email、備註，並列出我建立的所有客戶，可以編輯和刪除。Web 和 Mobile 都要有對應介面，Web 加在導覽列，Mobile 加到 App flow，Django Admin 後台也要給案主好管理。

Agent 會照本專案的範例（`items`）和內建 skill 自動建立後端 API、資料表、Web 頁面、Mobile 畫面、Django Admin 後台與測試，並跑檢查。

更多可直接複製的句型見下方「Prompt 範本」。

### 4) 驗收
> 跑一次所有檢查，確認沒有壞掉。

它會跑 `make check`（lint + 測試）。**全綠才算完成**；若有紅字，直接說：
> 有錯誤，幫我修好再跑一次。

### 5) 上線（要很小心）
> 部署到 stage 環境。

部署有自動的安全閘門與失敗回滾。正式環境（prod）請務必先在 stage 確認沒問題。**部署是難復原的動作，Agent 會先跟你確認。**

## 加 Mobile App 功能

Mobile App 放在 `mobile/`，是 Expo React Native，支援 iOS/Android。請 Agent 加功能時可以這樣說：

> 幫我在 mobile 加一個 X 功能，照 `mobile/src/features/items/` 的切片結構，API 走 `mobile/src/lib/api`，完成後跑 `make mobile-check`。

一般產品功能預設要 Web + Mobile 同步。只有當你確定某個功能只需要 App，才用上面這種「只在 mobile」的說法；否則請直接說：

> 幫我加一個 X 功能，後端 API、Web 頁面、Mobile 畫面都要同步完成，改完跑 `make check`。

本機測試 mobile 時先確認後端起來：

```bash
make dev
make dev-health
make mobile-start
```

如果是 iOS simulator，API 可用 `http://localhost:8000/api/v1`；Android emulator 用 `http://10.0.2.2:8000/api/v1`；實體手機用同網路下電腦的區網 IP。

## Prompt 範本（複製即用）

| 想做的事 | 對 Agent 說 |
|---|---|
| 新增資料功能 | 「幫我加一個『〇〇』功能，欄位有 A、B、C，可以新增/列出/編輯/刪除我自己的資料，Web 和 Mobile 都要有介面，Django Admin 後台也要給案主好管理。」 |
| 改欄位 | 「在『〇〇』功能加一個『狀態』欄位，可以是『待處理/處理中/完成』，Web 和 Mobile 都要同步。」 |
| 改畫面 | 「把『〇〇』列表改成卡片樣式，Web 和 Mobile 都要同步，並加上搜尋框。」 |
| 刪功能 | 「移除『〇〇』功能，後端 API、Web 路由/導覽、Mobile 入口/畫面和測試都要清乾淨。」 |
| 修 bug | 「我在做 X 的時候出現 Y 錯誤，這是畫面截圖／錯誤訊息，幫我修。」 |
| 檢查 | 「跑一次所有檢查，把結果告訴我。」 |
| 看狀態 | 「系統現在健康嗎？有哪些背景服務在跑？」 |

## 卡住時

- 把**完整的錯誤訊息**或**畫面截圖**貼給 Agent，說「幫我看這個錯誤」。
- 真的亂了：「幫我重置開發環境」（Agent 會跑 `make dev-reset`，會清掉本機測試資料，不影響正式環境）。

## 心法

- 一次只加一個功能，加完就驗收（跑檢查 + 看畫面），再加下一個。
- 描述「要的結果」，把「怎麼實作」交給 Agent 和這套模板的規範。
- 不確定時就問 Agent：「這樣做安全嗎？會不會影響其他功能？」
