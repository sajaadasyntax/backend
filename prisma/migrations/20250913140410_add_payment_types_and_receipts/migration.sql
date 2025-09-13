-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('SMALL_METER', 'MEDIUM_METER', 'LARGE_METER');

-- AlterTable
ALTER TABLE "public"."houses" ADD COLUMN     "paymentType" "public"."PaymentType" DEFAULT 'SMALL_METER',
ADD COLUMN     "receiptImage" TEXT;
