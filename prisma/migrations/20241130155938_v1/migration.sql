-- CreateTable
CREATE TABLE "TemporaryOrder" (
    "temp_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "TemporaryOrder_pkey" PRIMARY KEY ("temp_order_id")
);

-- CreateTable
CREATE TABLE "PermanentOrder" (
    "permanent_order_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "PermanentOrder_pkey" PRIMARY KEY ("permanent_order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryOrder_temp_order_id_key" ON "TemporaryOrder"("temp_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "PermanentOrder_permanent_order_id_key" ON "PermanentOrder"("permanent_order_id");
