#!/usr/bin/env bash
# Installe les dépendances, démarre Postgres/Redis, applique les migrations Prisma,
# puis lance web + API en dev (Turbo). À exécuter depuis n’importe quel répertoire.
# Prérequis : Node ≥ 20, pnpm ≥ 9, Docker (Compose v2).
# Variables : copier les .env.example vers .env / apps/api/.env / apps/web/.env.local
# si les fichiers n’existent pas encore (aucun écrasement des fichiers présents).
#
# Usage :
#   ./scripts/local-full-start.sh           # setup + pnpm dev
#   ./scripts/local-full-start.sh --setup-only   # install + migrate, sans lancer Turbo

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SETUP_ONLY=0
if [[ "${1:-}" == "--setup-only" ]]; then
  SETUP_ONLY=1
fi

die() {
  echo "Erreur: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "commande requise absente : $1"
}

copy_if_missing() {
  local src="$1"
  local dst="$2"
  if [[ -f "$dst" ]]; then
    return 0
  fi
  if [[ ! -f "$src" ]]; then
    die "fichier modèle manquant : $src"
  fi
  cp "$src" "$dst"
  echo "Créé $dst à partir de $src — édite les secrets avant usage réel."
}

# Lit une clé dans un fichier .env sans interpréter le shell (évite source .env).
read_env_key() {
  local file="$1"
  local key="$2"
  local def="$3"
  if [[ ! -f "$file" ]]; then
    printf '%s' "$def"
    return 0
  fi
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1)" || true
  if [[ -z "$line" ]]; then
    printf '%s' "$def"
    return 0
  fi
  local val="${line#*=}"
  val="${val%$'\r'}"
  val="${val#\"}"
  val="${val%\"}"
  printf '%s' "$val"
}

wait_postgres() {
  local user="$1"
  local db="$2"
  local i=0
  echo "Attente de Postgres (${user}/${db})…"
  while [[ $i -lt 90 ]]; do
    if docker compose exec -T postgres pg_isready -U "$user" -d "$db" >/dev/null 2>&1; then
      echo "Postgres est prêt."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  die "Postgres n'est pas devenu prêt à temps (docker compose logs postgres ?)."
}

require_cmd node
require_cmd pnpm
require_cmd docker

node_major="$(node -p "parseInt(process.version.slice(1), 10)" 2>/dev/null || echo 0)"
if [[ "$node_major" -lt 20 ]]; then
  die "Node 20+ requis (actuel : $(node -v 2>/dev/null || echo inconnu))."
fi

copy_if_missing ".env.example" ".env"
copy_if_missing "apps/api/.env.example" "apps/api/.env"
copy_if_missing "apps/web/.env.local.example" "apps/web/.env.local"

echo "Démarrage Postgres + Redis (docker compose)…"
docker compose up -d

pg_user="$(read_env_key .env POSTGRES_USER royalchess)"
pg_db="$(read_env_key .env POSTGRES_DB royalchess)"
wait_postgres "$pg_user" "$pg_db"

echo "Installation des dépendances (pnpm)…"
pnpm install

echo "Migrations Prisma (deploy)…"
(
  cd apps/api
  pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma
)

if [[ "$SETUP_ONLY" -eq 1 ]]; then
  echo "Setup terminé. Lance ensuite : pnpm dev"
  exit 0
fi

echo "Lancement web + API (Ctrl+C pour arrêter)…"
exec pnpm dev
