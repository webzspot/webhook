/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `PermanentOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id]` on the table `SessionPermanentOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PermanentOrder_order_id_key" ON "PermanentOrder"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPermanentOrder_order_id_key" ON "SessionPermanentOrder"("order_id");
