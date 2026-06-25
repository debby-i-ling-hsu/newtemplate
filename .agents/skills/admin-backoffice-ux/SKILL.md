---
name: admin-backoffice-ux
description: 設計或修改 Django Admin 後台時使用。當使用者提到後台、管理介面、案主管理、營運管理、Django Admin、admin UI/UX 時觸發。
---

# Django Admin 後台 UX

本 repo 的後台一律使用 Django Admin + django-unfold。後台使用者是非工程師案主/營運，不是開發者。

## 必守規則

1. **不另做自製後台**：案主/營運管理功能預設放 Django Admin；不要用 React 另外做 admin dashboard，除非使用者明確要求前台自助式管理流程。
2. **使用 Unfold**：`admin.py` 的 ModelAdmin 一律繼承 `unfold.admin.ModelAdmin`，不要退回原生 `admin.ModelAdmin`。
3. **繁體中文優先**：app 分群、model 顯示、fieldsets、actions、欄位說明、狀態文案以繁體中文為主。
4. **非工程師 UX**：列表要有可理解欄位、搜尋、篩選、日期導覽、合理分頁；表單要依工作流程分區，不要把資料庫欄位原樣堆出來。
5. **RWD**：不要加入破壞 django-unfold 響應式版面的客製 CSS/JS。
6. **專案名稱**：後台標題使用 `APP_NAME` / `ADMIN_SITE_TITLE` / `ADMIN_SITE_HEADER`，新專案不能留下 `fullstackapp` 模板名。

## 新增 model 的 Admin 最小配置

- `list_display`
- `search_fields`
- `list_filter`
- `date_hierarchy` 或其他清楚的日期/狀態導覽
- `list_per_page`
- `fieldsets`
- `readonly_fields` for 系統欄位
- `autocomplete_fields` for 可能變大的關聯欄位

完成後跑：

```
make backend-check
make backend-test
```
