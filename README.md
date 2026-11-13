# BrewLite

Ứng dụng đặt cà phê không tiền mặt (mobile-first / PWA) — đồ án môn **Công nghệ Phần mềm, HK I 2026–2027**, Assignment 2.

Luồng nghiệp vụ MVP: **Xem menu → Chọn size/topping → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn**, kèm màn hình quầy pha chế cho Barista.

| Hạng mục             | Giá trị                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Production (Web)** | _Chưa deploy — sẽ cập nhật khi có URL (xem [`docs/deployment.md`](./docs/deployment.md))_ |
| **Production (API)** | _Chưa deploy — `GET <api>/health` phải trả 200_                                           |
| **Phiên bản**        | 1.0.0 — xem [`docs/release-notes.md`](./docs/release-notes.md)                            |
| **Video demo**       | [`docs/demo.md`](./docs/demo.md)                                                          |
| **Phân công nhóm**   | [`docs/Assignment2-TaskAssignment.md`](./docs/Assignment2-TaskAssignment.md)              |

---

## Mục lục

1. [Nhóm thực hiện](#1-nhóm-thực-hiện)
2. [Công nghệ](#2-công-nghệ)
3. [Cấu trúc repo](#3-cấu-trúc-repo)
4. [Tài liệu Assignment 2](#4-tài-liệu-assignment-2)
5. [Chạy local](#5-chạy-local)
6. [Chạy bằng Docker](#6-chạy-bằng-docker)
7. [Tài khoản test & dữ liệu thanh toán](#7-tài-khoản-test--dữ-liệu-thanh-toán)
8. [Luồng demo end-to-end](#8-luồng-demo-end-to-end)
9. [API](#9-api)
10. [Kiểm thử](#10-kiểm-thử)
11. [CI/CD & triển khai](#11-cicd--triển-khai)
12. [Biến môi trường](#12-biến-môi-trường)
13. [Bảo mật, lỗi & log](#13-bảo-mật-lỗi--log)
14. [Đo hiệu năng](#14-đo-hiệu-năng)
15. [Quy ước đóng góp](#15-quy-ước-đóng-góp)
16. [Lệnh hữu ích](#16-lệnh-hữu-ích)

---

## 1. Nhóm thực hiện

| Thành viên     | Vai trò chính                | Phụ trách chính                                               |
| -------------- | ---------------------------- | ------------------------------------------------------------- |
| **Thanh Tùng** | Business Analyst / PM        | Task 1 (yêu cầu), traceability matrix, release notes, retro   |
| **Kiện Minh**  | System Modeler / Backend Dev | Task 2 (diagram), Order/Payment API, integration test         |
| **Hải Lý**     | Frontend Lead                | Frontend MVP (menu, chi tiết, giỏ, checkout, lịch sử), E2E    |
| **Hoàng Tịnh** | DevOps / Architect           | Task 3 (kiến trúc, ADR, deployment), CI/CD, deploy production |
| **Trung Hiếu** | Backend Lead / QA            | Products/Auth/Order/Payment API, `/health`, unit test         |

## 2. Công nghệ

| Lớp            | Công nghệ                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query 5, Zustand 5, React Hook Form + Zod, PWA (`manifest.ts` + `public/sw.js`) |
| **Backend**    | NestJS 11, Prisma 6, PostgreSQL 16, class-validator, Passport JWT, bcrypt, Helmet, `@nestjs/throttler`, Swagger                                       |
| **Thanh toán** | Mock Payment Gateway (thẻ / ví) có `Idempotency-Key`; VNPay Sandbox v2.1.0 (tùy chọn)                                                                 |
| **Kiểm thử**   | Jest + Supertest (API), Vitest + Testing Library (Web), Playwright (E2E)                                                                              |
| **DevOps**     | npm workspaces (monorepo), Docker / Docker Compose, GitHub Actions (CI + CD → GHCR), Husky + lint-staged, Prettier, ESLint, gitleaks                  |

Yêu cầu môi trường: **Node.js 22** (CI dùng 22.x), npm 10+, Docker Desktop (khuyến nghị) hoặc PostgreSQL 16 cài sẵn.

## 3. Cấu trúc repo

```text
BrewLite_Assignment_2/
├─ apps/
│  ├─ api/                         # @brewlite/backend — NestJS REST API (:3001)
│  │  ├─ prisma/                   # schema.prisma, migrations/, seed.ts
│  │  ├─ src/
│  │  │  ├─ auth/                  # register/login/me, JwtStrategy, JwtAuthGuard, RolesGuard
│  │  │  ├─ products/              # /products, /categories, /toppings
│  │  │  ├─ pricing/               # tính giá phía server (Single Source of Truth)
│  │  │  ├─ promotions/            # /promotions/validate (PERCENT / FIXED)
│  │  │  ├─ orders/                # /orders, OrderStatusService (state machine 7 trạng thái), hooks
│  │  │  ├─ payments/              # /payments (mock thẻ/ví + idempotency), VNPay sandbox
│  │  │  ├─ loyalty/  stock/       # điểm thưởng, tồn kho (optimistic locking)
│  │  │  ├─ common/                # HttpExceptionFilter, RequestLoggingMiddleware, DTO lỗi
│  │  │  ├─ prisma/                # PrismaService (@Global)
│  │  │  ├─ app.controller.ts      # GET /, GET /health
│  │  │  ├─ swagger.ts  main.ts
│  │  ├─ Dockerfile  docker-entrypoint.sh   # migrate deploy → seed → start
│  └─ web/                         # @brewlite/frontend — Next.js PWA (:3000, quầy :3002)
│     ├─ src/app/                  # menu, products/[id], cart, checkout, orders (+ vnpay-return), login, register, barista
│     ├─ src/components/  src/store/  src/lib/  src/hooks/
│     ├─ src/middleware.ts         # route guard /checkout
│     ├─ e2e/checkout.spec.ts      # Playwright
│     ├─ public/                   # sw.js, icons, ảnh sản phẩm
│     └─ Dockerfile
├─ tests/                          # test backend: unit, e2e (*.e2e-spec.ts), integration/
├─ docs/                           # tài liệu Assignment 2 (mục 4)
├─ scripts/
│  ├─ perf/                        # autocannon: products.js, orders.js
│  └─ render_puml.mjs              # render docs/diagrams/*.puml → .svg
├─ .github/
│  ├─ workflows/ci.yml  cd.yml
│  └─ pull_request_template.md
├─ docker-compose.yml              # full stack: postgres + adminer + backend + frontend
├─ docker-compose.dev.yml          # DB dev (postgres :5433, adminer :8080)
├─ .env.example                    # env gốc (compose + dev)
└─ package.json                    # scripts dùng chung cho workspaces
```

## 4. Tài liệu Assignment 2

| Task | Tạo phẩm                                  | Tệp                                                                                                                                                                                                                                                                         |
| :--: | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | Bối cảnh & phạm vi, SRS, use-case         | [`context-and-scope.md`](./docs/requirements/context-and-scope.md) · [`srs.md`](./docs/requirements/srs.md) · [`uc-checkout.md`](./docs/requirements/uc-checkout.md) · [`use-case-overview`](./docs/diagrams/use-case-overview.svg)                                         |
|  1   | Ma trận truy vết                          | [`traceability-matrix.md`](./docs/traceability-matrix.md)                                                                                                                                                                                                                   |
|  2   | Activity · Sequence · Class diagram       | [`activity-e2e`](./docs/diagrams/activity-e2e.svg) · [`sequence-checkout`](./docs/diagrams/sequence-checkout.svg) · [`class-domain`](./docs/diagrams/class-domain.svg) (nguồn `.puml` cùng thư mục)                                                                         |
|  2   | ERD                                       | [`erd_v2.md`](./docs/erd/erd_v2.md) · [`erd.dbml`](./docs/erd/erd.dbml)                                                                                                                                                                                                     |
|  3   | Kiến trúc + ADR                           | [`architecture/overview.md`](./docs/architecture/overview.md) · [`adr/`](./docs/architecture/adr/README.md) (001–005)                                                                                                                                                       |
|  3   | Deployment diagram + hướng dẫn triển khai | [`deployment.svg`](./docs/diagrams/deployment.svg) · [`deployment.md`](./docs/deployment.md)                                                                                                                                                                                |
|  4   | Hợp đồng API, quy ước làm việc            | [`api-contract.md`](./docs/api-contract.md) · [`CONTRIBUTING.md`](./docs/CONTRIBUTING.md)                                                                                                                                                                                   |
|  5   | Rollback, release, demo, review, retro    | [`runbook-rollback.md`](./docs/runbook-rollback.md) · [`release-notes.md`](./docs/release-notes.md) · [`demo.md`](./docs/demo.md) · [`demo-script.md`](./docs/demo-script.md) · [`sprint-review.md`](./docs/sprint-review.md) · [`sprint-retro.md`](./docs/sprint-retro.md) |
|  —   | Bằng chứng NFR                            | [`perf-report.md`](./docs/perf-report.md) (hiệu năng) · [`a11y-auth.md`](./docs/a11y-auth.md) (accessibility)                                                                                                                                                               |
|  —   | Backlog & kế hoạch sprint                 | [`BrewLite-ProductBacklog.md`](./docs/BrewLite-ProductBacklog.md) · [`BrewLite-Sprint3.md`](./docs/BrewLite-Sprint3.md) · ảnh UI trong [`docs/ui/`](./docs/ui/)                                                                                                             |

Render lại sơ đồ sau khi sửa `.puml`: `node scripts/render_puml.mjs`.

## 5. Chạy local

```bash
# 1. Cấu hình môi trường
cp .env.example .env                    # biến cho docker compose (POSTGRES_*)
cp apps/api/.env.example apps/api/.env  # biến cho NestJS + Prisma
cp apps/web/.env.example apps/web/.env.local

# 2. Cài dependencies (cài cho cả 2 workspace, bật Husky hook)
npm ci

# 3. Khởi động PostgreSQL dev bằng Docker (cổng 5433)
npm run dev:db
# (tùy chọn) Adminer xem DB tại :8080
docker compose -f docker-compose.dev.yml up -d adminer

# 4. Khởi tạo DB
npm run db:generate
npm run db:migrate
npm run db:seed          # menu mẫu + tài khoản test (mục 7)

# 5. Chạy ứng dụng
npm run dev              # Terminal A: backend :3001 + web khách :3000
npm run dev:barista      # Terminal B: web quầy pha chế :3002
```

> Dùng PostgreSQL cài sẵn thay Docker: bỏ bước 3, sửa `DATABASE_URL` trong `apps/api/.env` cho đúng host/port.

| URL                            | Mục đích                                        |
| ------------------------------ | ----------------------------------------------- |
| http://localhost:3000/menu     | Web khách hàng                                  |
| http://localhost:3002/barista  | Web quầy pha chế (login tài khoản BARISTA)      |
| http://localhost:3001/health   | Health check (trạng thái DB + version)          |
| http://localhost:3001/api-docs | Swagger UI (OpenAPI JSON: `/api-docs-json`)     |
| http://localhost:8080          | Adminer — server `postgres`, user/db `brewlite` |

Khách và quầy dùng **cùng codebase Next.js** nhưng chạy 2 instance khác port để `localStorage`/cookie tách riêng — đăng nhập song song 2 tài khoản trong cùng trình duyệt không đụng nhau. Cả hai gọi chung backend `:3001`; quầy polling 10 s, trang theo dõi đơn của khách polling 5 s.

## 6. Chạy bằng Docker

**Full stack (giống môi trường deploy):**

```bash
cp .env.example .env
docker compose up --build     # hoặc: npm run docker:up
```

| Service    | Cổng | Ghi chú                                                                                                    |
| ---------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| `postgres` | 5432 | volume `brewlite-postgres`, healthcheck `pg_isready`                                                       |
| `adminer`  | 8080 | xem dữ liệu                                                                                                |
| `backend`  | 3001 | build `./apps/api`; entrypoint tự chạy `prisma migrate deploy` + seed rồi start; healthcheck `GET /health` |
| `frontend` | 3000 | build `./apps/web`; chờ backend healthy                                                                    |

Dừng: `npm run docker:down`.

**Chỉ DB cho dev:** `docker compose -f docker-compose.dev.yml up -d postgres adminer` (Postgres ở `localhost:5433` để tránh đụng PostgreSQL cài sẵn ở 5432).

## 7. Tài khoản test & dữ liệu thanh toán

Tạo bởi `npm run db:seed` (seed idempotent, chạy lại không nhân bản dữ liệu):

| Vai trò  | Email                  | Mật khẩu      |
| -------- | ---------------------- | ------------- |
| CUSTOMER | `customer@brewlite.vn` | `Password123` |
| CUSTOMER | `an@brewlite.vn`       | `matkhau123`  |
| BARISTA  | `barista@brewlite.vn`  | `matkhau123`  |
| ADMIN    | `admin@brewlite.vn`    | `matkhau123`  |

**Mock Payment Gateway:**

| Phương thức | Dữ liệu                         | Kết quả                                          |
| ----------- | ------------------------------- | ------------------------------------------------ |
| Thẻ (CARD)  | `4242 4242 4242 4242`           | Thành công → đơn `PAID`                          |
| Thẻ (CARD)  | `4000 0000 0000 0002`           | Bị từ chối → đơn `PAYMENT_FAILED` (thử lại được) |
| Thẻ (CARD)  | không đủ 16 chữ số              | `400 Số thẻ không hợp lệ`                        |
| Ví (WALLET) | mặc định                        | Thành công                                       |
| Ví (WALLET) | đặt env `MOCK_WALLET_FAIL=true` | Bị từ chối (ví không đủ số dư)                   |

VNPay Sandbox (tùy chọn): đăng ký merchant sandbox tại https://sandbox.vnpayment.vn/devreg/, điền `VNP_TMN_CODE` và `VNP_HASH_SECRET` vào `apps/api/.env` (không commit). Để trống thì `POST /payments/vnpay/create-url` trả **503** và mọi callback VNPay bị coi là chữ ký không hợp lệ. Thẻ test: https://sandbox.vnpayment.vn/apis/vnpay-demo.

## 8. Luồng demo end-to-end

1. Khách mở `:3000/menu` → chọn món → chọn size/topping/số lượng → thêm vào giỏ → **Checkout** (yêu cầu đăng nhập `customer@brewlite.vn`).
2. Áp mã khuyến mãi (tùy chọn) → thanh toán thẻ `4242 4242 4242 4242` → chuyển tới `/orders/{id}` với badge **Đã thanh toán**.
3. Quầy `:3002/barista` (login `barista@brewlite.vn`) — đơn xuất hiện ở cột **Chờ pha** trong ≤ 10 s → **Nhận pha** → **Hoàn tất pha** → **Đã giao khách**.
4. Khách thấy trạng thái chuyển **Đang pha chế → Sẵn sàng** kèm banner "Đồ uống đã sẵn sàng!" trong ≤ 5 s; lịch sử đơn ở `/orders`.

Kịch bản chi tiết (kể cả nhánh lỗi: thẻ bị từ chối, hết hàng, chưa đăng nhập): [`docs/demo-script.md`](./docs/demo-script.md). Có thể bỏ qua UI quầy bằng `PATCH /orders/:id/status` trên Swagger (Authorize bằng JWT barista).

## 9. API

Tài liệu đầy đủ: Swagger `/api-docs` và [`docs/api-contract.md`](./docs/api-contract.md).

| Quyền                 | Endpoint                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Public**            | `GET /health` · `GET /products?category=&q=` · `GET /products/:id` · `GET /categories` · `GET /toppings`                 |
|                       | `POST /auth/register` · `POST /auth/login` (giới hạn 5 lần/phút/IP) · `POST /promotions/validate`                        |
| **JWT (khách)**       | `GET /auth/me`                                                                                                           |
|                       | `POST /orders` (header `Idempotency-Key`) · `GET /orders/me` · `GET /orders/:id` · `POST /orders/:id/cancel`             |
|                       | `POST /payments` (header `Idempotency-Key`) · `POST /payments/vnpay/create-url`                                          |
| **JWT BARISTA/ADMIN** | `GET /orders/queue` (đơn PAID/PREPARING/READY, FIFO) · `PATCH /orders/:id/status`                                        |
| **Callback / dev**    | `GET /payments/vnpay/ipn` · `GET /payments/vnpay/return` · `POST /payments/simulate` (bị chặn khi `NODE_ENV=production`) |

**Điểm thiết kế chính** (chi tiết trong [`docs/architecture/overview.md`](./docs/architecture/overview.md)):

- **Server tính giá:** giá, giảm giá, tổng tiền, điểm thưởng luôn tính lại từ DB, bỏ qua giá client gửi.
- **Idempotency:** `POST /orders` và `POST /payments` dùng `Idempotency-Key`; gửi lại cùng key → trả kết quả cũ (200) thay vì tạo đơn/trừ tiền lần hai. Với `/payments`, cùng key nhưng payload khác → **422**; với `/orders`, xung đột không replay được → **409** (ADR-003, ADR-005).
- **State machine đơn hàng** 7 trạng thái: `PENDING → PAID | PAYMENT_FAILED | CANCELLED`, `PAID → PREPARING → READY → COMPLETED`; chuyển sai → `409 INVALID_TRANSITION`.
- **Tồn kho** trừ bằng optimistic locking (`Product.version`), không bán âm kho.

`GET /health` mẫu:

```json
{
  "status": "ok",
  "timestamp": "2026-11-13T10:00:00.000Z",
  "uptime": 123.45,
  "service": "brewlite-backend",
  "database": "connected",
  "version": "1.0.0"
}
```

`version` lấy từ biến `BUILD_VERSION` (mặc định `1.0.0`).

## 10. Kiểm thử

| Loại                             | Vị trí                                                                  | Lệnh                                              |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| Unit + integration backend       | `apps/api/src/**/*.spec.ts`, `tests/**/*.spec.ts`, `tests/integration/` | `npm run test --workspace @brewlite/backend`      |
| E2E API (Supertest, cần DB)      | `tests/**/*.e2e-spec.ts`                                                | `npm run test:e2e --workspace @brewlite/backend`  |
| Coverage backend                 | —                                                                       | `npm run test:cov --workspace @brewlite/backend`  |
| Unit/component frontend (Vitest) | `apps/web/src/**/*.spec.ts(x)`                                          | `npm run test --workspace @brewlite/frontend`     |
| E2E checkout (Playwright)        | `apps/web/e2e/checkout.spec.ts`                                         | `npm run test:e2e --workspace @brewlite/frontend` |
| Tất cả unit (2 workspace)        | —                                                                       | `npm test`                                        |

Playwright cần DB đã migrate + seed và Chromium (`npx playwright install chromium`). Test chạy ở viewport mobile **375 × 667**, tự khởi động backend `:3001` và web `:3000`; báo cáo HTML, ảnh và video lưu ở `apps/web/playwright-report/` và `apps/web/test-results/` (CI upload thành artifact, giữ 7 ngày).

## 11. CI/CD & triển khai

**CI — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)** chạy khi push/PR vào `main`, `develop`:

| Job             | Các bước                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Secret scan** | `gitleaks dir .` với `.gitleaks.toml` — phát hiện secret thì job đỏ                                             |
| **Backend**     | `npm ci` → `prisma generate` → lint → build → `prisma migrate deploy` (Postgres service) → unit test → e2e test |
| **Frontend**    | `npm ci` → lint → build → migrate + seed DB → cài Chromium → Playwright E2E → upload báo cáo                    |

Quy ước nhóm: PR vào `main` chỉ merge khi CI xanh và có ít nhất 1 review (branch protection).

**CD — [`.github/workflows/cd.yml`](./.github/workflows/cd.yml)** chạy khi push tag `v*.*.*` hoặc chạy tay (Actions → _BrewLite CD_):

```
verify (build + test backend) → build & push 2 image lên GHCR → deploy (Render hook) → smoke test GET /health
```

- Image: `ghcr.io/<owner>/<repo>-api` và `-web`, tag = **commit SHA rút gọn** + semver (`1.2.3`, `1.2`).
- Bước deploy chỉ chạy khi đã cấu hình secret `RENDER_DEPLOY_HOOK` và variable `PRODUCTION_API_URL`; chưa cấu hình thì tự bỏ qua (pipeline không đỏ). Web build nhận `NEXT_PUBLIC_API_URL` từ repository variable.
- Smoke test chờ tối đa 5 phút cho `/health` trả 200.

**Phát hành một phiên bản:**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**Nền tảng đề xuất:** Web → Vercel (HTTPS + CDN), API → Render (Docker image từ GHCR), DB → Neon PostgreSQL 16 (SSL, không public). Thứ tự deploy, biến môi trường production và checklist nộp: [`docs/deployment.md`](./docs/deployment.md). Rollback (deploy lại image theo SHA cũ): [`docs/runbook-rollback.md`](./docs/runbook-rollback.md).

## 12. Biến môi trường

Không commit giá trị thật — chỉ cập nhật các file `*.env.example`.

| Biến                                                           | Nơi dùng       | Ví dụ / mặc định                                                       | Ghi chú                                                |
| -------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                                                 | API, Prisma    | `postgresql://brewlite:brewlite@localhost:5433/brewlite?schema=public` | Production Neon cần `sslmode=require`                  |
| `JWT_SECRET`                                                   | API            | `change-this-in-development`                                           | Production: chuỗi ngẫu nhiên ≥ 32 ký tự                |
| `PORT`                                                         | API            | `3001`                                                                 |                                                        |
| `CORS_ORIGIN`                                                  | API            | `http://localhost:3000,http://localhost:3002`                          | Nhiều origin cách dấu phẩy, không dùng `*`             |
| `THROTTLE_TTL` / `THROTTLE_LIMIT`                              | API            | `60` / `100`                                                           | Rate limit chung; `/auth/login` cố định 5 lần/phút     |
| `NODE_ENV`                                                     | API            | `development`                                                          | `production` ẩn stack trace, chặn `/payments/simulate` |
| `BUILD_VERSION`                                                | API            | `1.0.0`                                                                | Hiển thị ở `/health`                                   |
| `MOCK_WALLET_FAIL`                                             | API            | _(trống)_                                                              | `true` → ví luôn bị từ chối                            |
| `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL` | API            | xem `apps/api/.env.example`                                            | Chỉ cần khi dùng VNPay Sandbox                         |
| `NEXT_PUBLIC_API_URL`                                          | Web            | `http://localhost:3001`                                                | **Nhúng lúc build** — đổi giá trị phải build lại       |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`          | Docker Compose | `brewlite`                                                             | File `.env` ở gốc                                      |

## 13. Bảo mật, lỗi & log

**Bảo mật**

- Mật khẩu băm `bcrypt` (salt 10); JWT stateless HS256 (ADR-004); phân quyền `CUSTOMER` / `BARISTA` / `ADMIN` bằng `RolesGuard`.
- `helmet` cho security header; CORS whitelist theo `CORS_ORIGIN` với `credentials: true`.
- `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`, `transform`) — field lạ bị từ chối 400.
- Rate limit `@nestjs/throttler`: `POST /auth/login` tối đa 5 request/60 s/IP, request thứ 6 trả **429** kèm header `Retry-After`.
- Chống lộ secret: pre-commit hook (`.husky/pre-commit`) chạy `gitleaks protect --staged` với cấu hình `.gitleaks.toml` nếu máy đã cài gitleaks (`winget install gitleaks` / `scoop install gitleaks` / `brew install gitleaks`).

**Định dạng lỗi thống nhất** (`HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "code": "PROMO_EXPIRED",
  "message": "Mã giảm giá 'HETHAN' đã hết hạn hoặc chưa tới thời gian sử dụng",
  "error": "Bad Request",
  "path": "/promotions/validate",
  "timestamp": "2026-11-05T10:00:00.000Z",
  "requestId": "0b6f8a52-3f7c-4a5e-9d0e-6f1c2b7a9e11"
}
```

`code` chỉ có ở lỗi nghiệp vụ (`PROMO_*`, `INVALID_TRANSITION`, `ORDER_NOT_PAYABLE`, `OUT_OF_STOCK`, `IDEMPOTENCY_KEY_*`). Ở `NODE_ENV=production`, lỗi 500 chỉ trả `statusCode`, `message: "Internal server error"`, `requestId`, `timestamp` — stack trace chỉ nằm trong log server.

**Log request & `X-Request-Id`**

Mỗi request sinh một dòng log khi response kết thúc (kể cả 401/404/429):

```text
LOG  [HTTP] [0b6f8a52-...] GET /products?q=ca%20phe 200 16.8ms
WARN [HTTP] [5d1c...] POST /orders 401 2.1ms
WARN [HttpExceptionFilter] [5d1c...] 401 Unauthorized: Unauthorized
```

- Mức `LOG` cho 2xx/3xx, `WARN` cho 4xx, `ERROR` cho 5xx (kèm stack trace).
- `requestId` lấy từ header `X-Request-Id` client gửi (chỉ nhận chữ, số, `.`, `_`, `-`, tối đa 128 ký tự), không có thì server sinh UUID; luôn trả lại trong header và trong body lỗi.
- Tra một request: lấy `requestId` từ tab Network hoặc body lỗi rồi lọc log:
  ```bash
  npm run dev 2>&1 | grep "<requestId>"            # local
  docker compose logs backend | grep "<requestId>" # Docker
  ```

## 14. Đo hiệu năng

Chạy trên DB riêng (vì `POST /orders` tạo đơn thật) và nâng rate limit để không bị 429:

```bash
npm run build
THROTTLE_LIMIT=1000000 NODE_ENV=production npm run start --workspace @brewlite/backend
npm run perf:products   # GET /products
npm run perf:orders     # POST /orders có Bearer token
```

Biến tùy chọn: `PERF_BASE_URL`, `PERF_DURATION` (giây, mặc định 20), `PERF_CONNECTIONS` (mặc định 10), `PERF_OUT` (ghi JSON kết quả). Script thoát mã 1 nếu p95 ≥ 500 ms hoặc có response không phải 2xx. Kết quả: [`docs/perf-report.md`](./docs/perf-report.md) (NFR-01, NFR-02).

## 15. Quy ước đóng góp

Chi tiết: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

- Nhánh: `feature/<task-code>-<slug>` (ví dụ `feature/t5.3-cicd`); PR tiêu đề `[T<x.y>] <mô tả ngắn>`, dùng [PR template](./.github/pull_request_template.md).
- Commit theo **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`…).
- Mọi thay đổi vào `main` qua Pull Request, CI xanh và ≥ 1 review.
- Pre-commit tự chạy ESLint + Prettier trên file đã stage (`.lintstagedrc.json`).
- Đổi API → cập nhật `docs/api-contract.md` và Swagger; thêm biến môi trường → cập nhật `.env.example`.

## 16. Lệnh hữu ích

```bash
npm run dev            # backend + web khách
npm run dev:barista    # web quầy :3002
npm run dev:db         # Postgres dev (:5433)
npm run build          # prisma generate + build API + build web
npm run lint           # lint cả 2 workspace   (lint:fix để tự sửa)
npm run format         # prettier toàn repo     (format:check để kiểm tra)
npm test               # unit test cả 2 workspace
npm run db:generate    # sinh Prisma Client
npm run db:migrate     # tạo/áp migration (dev)
npm run db:seed        # seed dữ liệu mẫu
npm run docker:up      # docker compose up --build
npm run docker:down    # dừng stack Docker
```
