/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `TemporaryOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TemporaryOrder_order_id_key" ON "TemporaryOrder"("order_id");
