# AGENTS.md — Beer Game (Supply Chain Simulation)

## Project overview

Monorepo: `frontend/` (React 19 + Vite 7 + TypeScript 5.9) + `backend/` (ASP.NET Core 8, in-memory game state).  
No database. No tests exist.

## Frontend

| Command | From | What |
|---|---|---|
| `npm run dev` | `frontend/` | Vite dev server on `:3000`, proxies `/api → :5219` |
| `npm run build` | `frontend/` | Vite production build |
| `npm run typecheck` | `frontend/` | `tsc --noEmit` |

- Stack: React 19, Vite 7, Tailwind 4, shadcn/ui (new-york style), wouter (routing), TanStack React Query, framer-motion, lucide-react
- Path alias `@/` → `frontend/src/`, `@assets/` → `attached_assets/`
- API client is **Orval-generated** (`src/api-client/generated/`). Regenerate after backend API changes.
- `.npmrc`: `auto-install-peers=false`, `strict-peer-dependencies=false`

## Backend

- Run: `dotnet run` from `backend/BeerGameAPI/BeerGameAPI/` (HTTP :5219, Swagger at `/swagger`)
- .NET 8, implicit usings, nullable enabled
- Singleton `GameService` holds all state in memory; `Reset()` starts a fresh game
- CORS allows `localhost:3000` only
- Enums use `JsonStringEnumConverter` (lowercase serialization like `"retailer"`)

### API endpoints (all prefixed `/api`)

| Endpoint | Purpose |
|---|---|
| `GET /healthz` | Health check |
| `GET /game/state` | Full game state |
| `POST /game/reset` | Reset game |
| `GET /game/players/{role}` | Single player state |
| `GET /turns/current` | Current turn info |
| `POST /turns/advance` | Advance turn phase |
| `POST /turns/process-arrivals?role=` | Process arrivals for a role |
| `GET /orders?role=&status=` | List orders |
| `POST /orders` | Place order `{fromRole, quantity}` |
| `POST /orders/{id}/fulfill` | Fulfill pending order |
| `GET /events?role=&acknowledged=` | List game events |
| `POST /events/{id}/acknowledge` | Acknowledge event |
| `GET /analytics/summary` | Analytics summary |
| `GET /analytics/history` | Turn snapshots |
| `GET /analytics/transit` | In-transit orders |

### Game mechanics

- 3 roles: `retailer` → `wholesaler` → `factory` (supply chain downstream to upstream)
- Turn phases: `arrivals` → `events` → `order` → `done` (cycle)
- Lead time: 2 turns. Base demand: 4 (±1 random). Initial stock: 12. Initial money: $100.
- Holding cost: $0.50/unit/turn. Stockout cost: $1.00/unit/turn.
- Game ends at day 50.

## Routes

- `/` — Home
- `/retailer`, `/wholesaler`, `/factory` — Player dashboards
- `/analytics` — Analytics dashboard

## Gotchas

- Run backend **before** frontend; frontend proxies `/api` to `localhost:5219`
- API client is generated — hand-modify `src/api-client/generated/*` only in emergencies
- No lint/prettier config, no test runner
- Do NOT use Tailwind dynamic class names (template literals in className) — use static classes with `cn()` and role-based conditions
- Avoid hardcoded Tailwind utility colors (`text-red-500`, `bg-gray-50`, etc.) in page components — use theme CSS variables (`text-destructive`, `bg-muted`, `text-chart-*`)
