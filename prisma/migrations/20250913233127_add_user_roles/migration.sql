-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MOBILE_USER');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'MOBILE_USER';
