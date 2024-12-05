/*
  Warnings:

  - Added the required column `payment_id` to the `PermanentOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PermanentOrder" ADD COLUMN     "payment_id" TEXT NOT NULL;
