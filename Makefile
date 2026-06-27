.PHONY: help \
	dev dev-down dev-restart dev-reset dev-logs dev-logs-service dev-shell \
	dev-superuser dev-makemigrations dev-health \
	dev-dump dev-restore stage-dump stage-restore prod-dump prod-restore ANY YES \
	backend-venv backend-check backend-test backend-fmt \
	frontend-install frontend-lint frontend-test frontend-build \
	mobile-install mobile-start mobile-ios mobile-android mobile-lint mobile-typecheck mobile-test mobile-check \
	check stage stage-down stage-logs stage-health prod prod-down prod-logs prod-health

# host 的 make 與排程備份 sidecar 共用同一個 compose project name，
# scripts/db.sh 的 `compose exec` 才會打到同一組容器。
export COMPOSE_PROJECT_NAME ?= newtemplate

COMPOSE_DEV := docker compose -f docker-compose.dev.yml
COMPOSE_STAGE := docker compose -f docker-compose.stage.yml
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
VENV := backend/.venv
PY := $(VENV)/bin/python

# 備份 / 還原旗標（裸字目標 ANY / YES，靠 MAKECMDGOALS 偵測後轉成 scripts/db.sh 旗標）：
#   make <env>-dump                  備份 <env> DB → backups/<env>_<時間>.sql.gz
#   make <env>-restore               還原同環境最新備份（直接覆蓋，會要求確認）
#   make <env>-restore FILE=<file>   只還原指定的一份（跨環境遷移用）
#   make <env>-restore ANY           不分環境，還原 backups/ 內最新的一份
#   make <env>-restore YES           略過確認（CI / 非互動）
_restore_flags = $(if $(FILE),-f $(FILE),) $(if $(filter ANY,$(MAKECMDGOALS)),-a,) $(if $(filter YES,$(MAKECMDGOALS)),-y,)
ANY: ; @:
YES: ; @:

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── 本機開發 ────────────────────────────────────────────────
dev: ## 啟動本機開發環境（Vite :3000、Django 同網域 :8000）
	@test -f backend/env/.env.dev || cp backend/env/.env.dev.example backend/env/.env.dev
	$(COMPOSE_DEV) up -d --build

dev-down: ## 停止開發環境
	$(COMPOSE_DEV) down --remove-orphans

dev-restart: ## 重啟開發環境服務
	$(COMPOSE_DEV) restart

dev-reset: ## 砍掉並重建開發環境（清除 db/redis volume）
	$(COMPOSE_DEV) down -v --remove-orphans
	$(COMPOSE_DEV) up -d --build --force-recreate

dev-logs: ## 追全部 log
	$(COMPOSE_DEV) logs -f

dev-logs-service: ## 追單一服務 log（SERVICE=web|worker-default|...）
	$(COMPOSE_DEV) logs -f $(SERVICE)

dev-shell: ## 進入 web 容器 shell
	$(COMPOSE_DEV) exec web bash

dev-superuser: ## 建立 Django 管理員帳號
	$(COMPOSE_DEV) exec web python manage.py createsuperuser

dev-makemigrations: ## 產生 migration（改 model 後執行）
	$(COMPOSE_DEV) exec web python manage.py makemigrations

dev-health: ## 檢查 /healthz/ready/
	$(COMPOSE_DEV) exec -T web curl -fsS http://127.0.0.1:8000/healthz/ready/

dev-dump: ## 備份 dev DB → backups/dev_<時間>.sql.gz
	@./scripts/db.sh dump dev

dev-restore: ## 還原 dev DB（FILE=… / ANY / YES，預設同環境最新；破壞性）
	@./scripts/db.sh restore dev $(_restore_flags)

# ── 後端檢查（本機 venv，與 CI 一致）────────────────────────
backend-venv: ## 建立後端 venv 並安裝 dev 依賴
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r backend/requirements-dev.txt

backend-check: ## ruff + black --check + django check
	cd backend && .venv/bin/ruff check .
	cd backend && .venv/bin/black --check .
	cd backend && DJANGO_SETTINGS_MODULE=config.settings.test DJANGO_ENV=test .venv/bin/python manage.py check

backend-fmt: ## 自動修正 ruff + black 格式
	cd backend && .venv/bin/ruff check --fix .
	cd backend && .venv/bin/black .

backend-test: ## 跑後端測試（sqlite in-memory）
	cd backend && DJANGO_SETTINGS_MODULE=config.settings.test DJANGO_ENV=test .venv/bin/python manage.py test

# ── 前端檢查 ────────────────────────────────────────────────
frontend-install: ## 安裝前端依賴
	npm --prefix frontend install

frontend-lint: ## 前端 lint
	npm --prefix frontend run lint

frontend-test: ## 前端測試
	npm --prefix frontend run test

frontend-build: ## 前端建置
	npm --prefix frontend run build

# ── Mobile App 檢查 ────────────────────────────────────────
mobile-install: ## 安裝 mobile 依賴
	npm --prefix mobile install

mobile-start: ## 啟動 Expo dev server
	npm --prefix mobile run start

mobile-ios: ## 啟動 iOS simulator
	npm --prefix mobile run ios

mobile-android: ## 啟動 Android emulator
	npm --prefix mobile run android

mobile-lint: ## Mobile lint
	npm --prefix mobile run lint

mobile-typecheck: ## Mobile TypeScript 檢查
	npm --prefix mobile run typecheck

mobile-test: ## Mobile Jest 測試
	npm --prefix mobile run test

mobile-check: mobile-lint mobile-typecheck mobile-test ## 跑 mobile 最小檢查

check: backend-check backend-test frontend-lint frontend-test frontend-build mobile-check ## 跑所有檢查（CI 等價）

# ── Stage / Prod（安全部署，含健康閘門與自動回滾）──────────
stage: ## 部署 stage（scripts/deploy.sh）
	./scripts/deploy.sh stage

stage-down: ## 停止 stage
	$(COMPOSE_STAGE) down --remove-orphans

stage-logs: ## 追 stage log
	$(COMPOSE_STAGE) logs -f

stage-health: ## 檢查 stage /healthz/ready/
	$(COMPOSE_STAGE) exec -T web curl -fsS http://127.0.0.1:8000/healthz/ready/

stage-dump: ## 備份 stage DB → backups/stage_<時間>.sql.gz
	@./scripts/db.sh dump stage

stage-restore: ## 還原 stage DB（FILE=… / ANY / YES；破壞性）
	@./scripts/db.sh restore stage $(_restore_flags)

prod: ## 部署 prod（scripts/deploy.sh）
	./scripts/deploy.sh prod

prod-down: ## 停止 prod
	$(COMPOSE_PROD) down --remove-orphans

prod-logs: ## 追 prod log
	$(COMPOSE_PROD) logs -f

prod-health: ## 檢查 prod /healthz/ready/
	$(COMPOSE_PROD) exec -T web curl -fsS http://127.0.0.1:8000/healthz/ready/

prod-dump: ## 備份 prod DB → backups/prod_<時間>.sql.gz
	@./scripts/db.sh dump prod

prod-restore: ## 還原 prod DB（FILE=… / ANY / YES；破壞性，務必謹慎）
	@./scripts/db.sh restore prod $(_restore_flags)
