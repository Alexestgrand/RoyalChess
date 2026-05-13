-- AlterTable
ALTER TABLE "Game" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Game_inviteCode_key" ON "Game"("inviteCode");

-- AlterTable (partie privée : adversaire assigné plus tard)
ALTER TABLE "Game" ALTER COLUMN "blackPlayerId" DROP NOT NULL;
