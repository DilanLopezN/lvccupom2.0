/*
  Warnings:

  - You are about to drop the column `maxCupoms` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[partner_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "maxCupoms",
ADD COLUMN     "lover_coins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lover_strikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "partner_id" UUID,
ADD COLUMN     "tokens" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "coupon_fulfillments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "confirmed_by_id" UUID NOT NULL,
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,
    "fulfilled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_fulfillments_coupon_id_key" ON "coupon_fulfillments"("coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_partner_id_key" ON "users"("partner_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_fulfillments" ADD CONSTRAINT "coupon_fulfillments_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_fulfillments" ADD CONSTRAINT "coupon_fulfillments_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
