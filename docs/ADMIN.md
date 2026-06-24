# 後台技術參考（Django Admin + django-unfold）

案主 / 營運用的後台**一律建在 Django Admin**（theme 用 `django-unfold`），不另做自製 React 後台，除非使用者明確要求前台自助流程。後台使用者是非工程師案主，不是開發者。

規範見 [AGENTS.md](../AGENTS.md) 的「後台 UX 契約」；設計理由見 [ARCHITECTURE.md](ARCHITECTURE.md) 的「後台組織」。設計 / 修改後台時用 skill `admin-backoffice-ux`。

---

## 1. 設定

`settings/base.py`：

- `unfold` 必須排在 `django.contrib.admin` **之前**（`DJANGO_APPS` 第一個）。
- 標題走環境變數：`ADMIN_SITE_TITLE` / `ADMIN_SITE_HEADER` / `ADMIN_INDEX_TITLE`（預設 `{APP_NAME} 後台` / `管理首頁`），在 `config/urls.py` 套到 `admin.site`。**複製模板後務必改成專案名稱**。
- `UNFOLD` dict：`SITE_TITLE`/`SITE_HEADER`/`SITE_SUBHEADER`、`SITE_URL="/"`、`SITE_SYMBOL`、`SHOW_HISTORY=True`、`BORDER_RADIUS`、`SIDEBAR.show_search`/`show_all_applications`。

入口：`/admin/`。

---

## 2. ModelAdmin 範本（`items/admin.py`）

新增營運用 model 時照這個寫，**一律繼承 `unfold.admin.ModelAdmin`**（不要退回原生 `admin.ModelAdmin`）：

```python
from unfold.admin import ModelAdmin

@admin.register(Item)
class ItemAdmin(ModelAdmin):
    list_display = ["id", "name", "owner", "is_done", "created_at"]
    list_filter = ["is_done", "created_at"]
    search_fields = ["name", "description"]
    autocomplete_fields = ["owner"]          # 關聯資料量會長大時用
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    list_per_page = 30
    fieldsets = (                            # 按工作流程分區，不要原樣堆欄位
        ("基本資料", {"fields": ("name", "description", "is_done")}),
        ("歸屬與系統資訊", {"fields": ("owner", "created_at", "updated_at")}),
    )
```

要點：

- **list 頁讓案主快速找資料**：`list_display`、`search_fields`、`list_filter`、`date_hierarchy`、合理 `list_per_page`。
- **關聯欄位用 `autocomplete_fields`**（資料量會長大時），避免下拉爆量。被指定的關聯 model 自己要有 `search_fields`。
- **change form 按工作流程分區**（`fieldsets`），不要把資料庫欄位原樣堆出來。
- **系統欄位 readonly**：`owner`、時間戳、狀態歷史等該 readonly 就 readonly。
- **文案繁體中文**：app 分群、model 顯示、fieldsets 標題、help text、actions、錯誤提示。

---

## 3. User / Group Admin（`accounts/admin.py`）

自訂 `User` 的 admin 同時繼承 `BaseUserAdmin` 與 unfold `ModelAdmin`，並用 unfold 的表單類（`UserChangeForm` / `UserCreationForm` / `AdminPasswordChangeForm`），讓使用者管理也吃到 unfold 樣式：

```python
@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    fieldsets = BaseUserAdmin.fieldsets + (("案主顯示資訊", {"fields": ("display_name",)}),)
```

`Group` 也重新註冊成 unfold 樣式（先 unregister 原生再 register）。

---

## 4. RWD 與限制

- 後台必須 RWD 可用；**不要引入破壞 unfold 響應式版面的客製 CSS/JS**。
- 共用 admin 註冊放 `common/admin.py`（目前空）。

---

## 5. 加 model 時的後台檢查清單

- [ ] 繼承 `unfold.admin.ModelAdmin`。
- [ ] `list_display` / `search_fields` / `list_filter` / `date_hierarchy` 讓案主找得到資料。
- [ ] 關聯欄位視資料量用 `autocomplete_fields`（並確保對方有 `search_fields`）。
- [ ] `fieldsets` 按工作流程分區；系統欄位 readonly。
- [ ] 文案繁體中文、非工程師看得懂。
- [ ] RWD 沒被自訂 CSS/JS 破壞。

> 新增使用者可見功能時，除非明確只改單一介面，後台要與 Web/Mobile 一起完成。見 [AGENTS.md](../AGENTS.md)。
</content>
