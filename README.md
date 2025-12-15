# Wallet Service (NestJS + Postgres + Sequelize)

Wallet service backed by Postgres (via Sequelize) that supports creating wallets, funding, transfers, transaction history, and optional idempotency keys for fund/transfer operations.

## Prerequisites
- Node.js 18+
- Postgres running locally (defaults below) or reachable via env vars

## Environment
Defaults work with a local Postgres that has a `wallets` database and a `postgres/postgres` user. Override via env:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=wallets
PORT=3000
```

## Setup
```bash
cd /Users/abdulraqeeb/Workspace/novacrust
npm install
npm run start   # starts Nest app on port 3000 (uses Postgres)
```

## API
- Base path: `{{baseUrl}}/api/v1` (e.g. `http://localhost:3000/api/v1`)
- `POST /api/v1/wallet/create` → create a wallet (currency fixed to USD, requires `pin`)
- `POST /api/v1/wallet/:id/fund` → add funds; body `{ amount, idempotencyKey? }`
- `POST /api/v1/wallet/transfer` → move funds; body `{ fromWalletId, toWalletId, amount, pin, idempotencyKey? }`
- `GET /api/v1/wallet/:id/get-wallet` → wallet details
- `GET /api/v1/wallet/:id/transactions` → transaction history
- `POST /api/v1/wallet/:id/pin/update` → body `{ oldPin, newPin }`
- `POST /api/v1/wallet/:id/pin/reset` → body `{ newPin }`

### Notes
- Validation via `class-validator` and global `ValidationPipe`.
- Idempotency (optional): supply an `idempotencyKey` string; repeated requests with the same key and inputs return the first result without mutating balances again (stored in Postgres).
- Data is persisted in Postgres; `synchronize: true` is enabled for convenience (no migrations yet).
- PIN is required for transfers; pin update/reset endpoints are provided.
- All service methods return a standard response envelope: `{ status, statusCode, message, data }`.

## Testing
```bash
npm test        # run unit tests (Jest)
npm test:cov    # run tests with coverage
```

Current tests focus on `WalletService`:
- create wallet (happy path)
- fund wallet (happy path + wallet-not-found)
- transfers (happy path, same-wallet guard, PIN validation)
- transaction history fetching
- PIN update/reset flows

## Postman
Import `postman/wallet-collection.json`. Set `{{baseUrl}}` to `http://localhost:3000` and `{{walletId}}` variables after creating a wallet.

## Assumptions
- Single currency (`USD`) as per requirements; multi-currency is out of scope.
- Transaction history is kept in the `transactions` table and returned most-recent-first.
- Large amounts are guarded with a simple per-request max of `1,000,000,000`.
- **Authentication & authorization**: assumed to be handled elsewhere (e.g. global auth guard / middleware), and that:
  - the current user is already authenticated before reaching these wallet endpoints, and
  - any per-user or per-company scoping of wallets is enforced by upstream layers.
- Error handling:
  - Controllers follow a `try/catch` pattern, log via Winston, and always return a structured JSON error shape.
  - A global process-level error handler ensures graceful shutdown on crashes (uncaught exceptions, unhandled rejections, SIGINT/SIGTERM).
- Idempotency:
  - `idempotencyKey` uniqueness and retention policies are assumed to be acceptable at the table level for this exercise (no TTL/cleanup job yet).
  - Clients are responsible for generating collision-safe idempotency keys.
- Security:
  - PIN values are stored as plain strings for demonstration; in a real system these would be hashed and protected via proper KMS/secrets management.
  - Network-level concerns (TLS, API gateway, rate limiting, WAF) are assumed to be handled in the deployment environment.


