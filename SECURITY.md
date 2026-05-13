# Sécurité — dépendances (audit production)

## Contexte

Après application de surcharges `pnpm.overrides` à la racine du monorepo (`lodash`, `multer`, `postcss`, `tar`, `uuid`, `js-yaml`) pour traiter les vulnérabilités **high** transitives (notamment `tar` via `bcrypt` / `@mapbox/node-pre-gyp`, `multer` via Nest 10, `postcss` via Next), la commande suivante peut encore retourner un code de sortie non nul :

```bash
pnpm audit --prod
```

À la date de la dernière mise à jour de ce fichier, il reste des alertes **moderate** sans correctif sans migration majeure.

## Vulnérabilités modérées acceptées (mitigation)

| Chaîne / paquet | CVE / advisory | Raison du non-fix immédiat | Mitigation |
|-----------------|----------------|---------------------------|------------|
| `@nestjs/common` → `file-type@20.x` | GHSA-5v7r-6r5c-r473, GHSA-j47w-4g3g-c36v | Correctif en `file-type` ≥ 21 ; Nest 10 pinne la 20.x. Passer l’API applicative (`fromBuffer` en v16) vers la v21+ impose une refonte ciblée des uploads. | Entrées upload limitées (taille, MIME, re-traitement `sharp`) ; mise à jour Nest 11+ planifiée pour absorber la chaîne corrigée. |
| `@nestjs/core@10.4.x` | GHSA-36xv-jgw5-4q75 | Correctif annoncé en `@nestjs/core` ≥ 11.1.18 ; migration Nest 10 → 11 = breaking change orchestré hors hotfix perf. | Entrées HTTP validées (Zod, pipes), pas d’interpolation de sorties utilisateur dans les réponses d’erreur brutes. |
| `@nestjs/swagger` → dépendances OpenAPI | Selon rapport `pnpm audit` | Chaîne de génération de documentation ; versions alignées via overrides quand la résolution pnpm le permet. | Exposition limitée au runtime (schémas build-time / doc). |

## Commande CI recommandée pour le seuil « high »

Pour un pipeline qui ne doit pas échouer sur les seules alertes **moderate** tout en bloquant **high** et **critical**, le monorepo expose :

```bash
pnpm run audit:prod
```

(équivalent à `pnpm audit --prod --audit-level high`.)

Les surcharges `pnpm.overrides` du `package.json` racine restent la source de vérité pour forcer les versions patchées là où la résolution transitive ne le fait pas spontanément.
