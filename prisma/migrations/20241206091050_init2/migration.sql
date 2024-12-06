-- CreateTable
CREATE TABLE "TemporaryOrderSession" (
    "temp_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "TemporaryOrderSession_pkey" PRIMARY KEY ("temp_order_id")
);

-- CreateTable
CREATE TABLE "PermanentOrderSession" (
    "permanent_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "PermanentOrderSession_pkey" PRIMARY KEY ("permanent_order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryOrderSession_temp_order_id_key" ON "TemporaryOrderSession"("temp_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryOrderSession_order_id_key" ON "TemporaryOrderSession"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "PermanentOrderSession_permanent_order_id_key" ON "PermanentOrderSession"("permanent_order_id");
