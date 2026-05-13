-- AlterTable : ajout des métadonnées de fin de partie
-- Toutes les colonnes sont nullable → migration non destructive,
-- rétrocompatible avec les enregistrements existants.
ALTER TABLE "Game" ADD COLUMN "endReason" TEXT;
ALTER TABLE "Game" ADD COLUMN "whiteEloChange" INTEGER;
ALTER TABLE "Game" ADD COLUMN "blackEloChange" INTEGER;
ALTER TABLE "Game" ADD COLUMN "whiteEloAfter" INTEGER;
ALTER TABLE "Game" ADD COLUMN "blackEloAfter" INTEGER;
