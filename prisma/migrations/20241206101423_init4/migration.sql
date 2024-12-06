/*
  Warnings:

  - You are about to drop the `PermanentOrderSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemporaryOrderSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PermanentOrderSession";

-- DropTable
DROP TABLE "TemporaryOrderSession";

-- CreateTable
CREATE TABLE "SessionTempOrder" (
    "session_temp_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "SessionTempOrder_pkey" PRIMARY KEY ("session_temp_order_id")
);

-- CreateTable
CREATE TABLE "SessionPermanentOrder" (
    "session_permanent_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "SessionPermanentOrder_pkey" PRIMARY KEY ("session_permanent_order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionTempOrder_session_temp_order_id_key" ON "SessionTempOrder"("session_temp_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTempOrder_order_id_key" ON "SessionTempOrder"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPermanentOrder_session_permanent_order_id_key" ON "SessionPermanentOrder"("session_permanent_order_id");
