# RoyalChess — Architecture

## Stack

| Zone | Technologie | Rôle |
|------|----------------|------|
| Monorepo | **pnpm** + **Turborepo** | Workspaces `apps/*`, `packages/*`, pipelines `build`, `dev`, `test`, `lint`. |
| Frontend | **Next.js 15** (App Router ; passage depuis la cible 14 pour **`next.config.ts`** natif), **Tailwind**, **shadcn/ui** (base **slate**, variables CSS), **Zustand**, **Socket.io client**, **chess.js**, **@dnd-kit** | UI, SSR/SSG, client temps réel, drag & drop échiquier. |
| Backend | **NestJS**, **Prisma** (PostgreSQL), **Socket.io** (`@nestjs/platform-socket.io`), **ioredis** (prévu pour files / session), **Pino**, **Helmet**, **Throttler** | API REST, gateways WebSocket, persistance, observabilité. |
| Partagé | **`@royalchess/shared`** (TypeScript `composite`) | Types, schémas Zod, **enum `SocketEvent`** — contrat unique des événements temps réel. |

`pnpm dev` à la racine exécute **turbo dev** : les tâches `dev` des workspaces **@royalchess/web** et **@royalchess/api** tournent en parallèle (persistantes).

## Patterns

- **Repository** : accès données Prisma encapsulé (`*.repository.ts`) — les contrôleurs ne touchent pas Prisma directement.
- **Gateway WebSocket** : namespaces dédiés (`/matchmaking`, `/game`) — authentification JWT côté handshake pour la partie compétitive (`WsJwtGuard`).
- **Validation** : Zod (config Nest, DTO, package shared) — pas de logique métier dans les composants React (hooks / server actions uniquement).

## Flux de données

- **REST** : CRUD stable, auth (login / refresh), profil, création / liste de parties, export PGN — latence acceptable, cache HTTP possible.
- **WebSocket exclusivement** pour le temps réel : coups (`SocketEvent.MOVE_PIECE`), état (`GAME_STATE_UPDATE`), matchmaking (`MATCHMAKING_*`), chat (`CHAT_MESSAGE`), erreurs canal (`CONNECTION_ERROR`). Les noms d’événements sont ceux de l’enum `SocketEvent` dans `packages/shared`.

## Sécurité (web)

`next.config.ts` définit des en-têtes HTTP : **X-Frame-Options**, **CSP** (stricte avec ajustements nécessaires au runtime Next), **HSTS** (production), **X-Content-Type-Options**, **Referrer-Policy**, **Permissions-Policy**.

## Charte UI

Couleurs Tailwind **royal** : fond `#0D0D12`, or `#C9A84C`, ivoire `#F0EAD6` (tokens `royal-*` + variables shadcn slate).

## Docker

`docker-compose.yml` : **PostgreSQL 16** et **Redis 7** (`appendonly yes`), variables injectées via **`.env`** à la racine (voir `.env.example`).

## Commandes

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
docker compose up -d
pnpm --filter @royalchess/api prisma:migrate
pnpm dev
```

Si la commande `pnpm` est absente : `corepack enable` puis `corepack prepare pnpm@9.15.9 --activate`, ou `npm i -g pnpm@9`.
