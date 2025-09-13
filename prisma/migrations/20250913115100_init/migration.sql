-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."squares" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "neighborhoodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."houses" (
    "id" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT true,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "requiredAmount" DOUBLE PRECISION,
    "squareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_name_key" ON "public"."neighborhoods"("name");

-- AddForeignKey
ALTER TABLE "public"."squares" ADD CONSTRAINT "squares_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."houses" ADD CONSTRAINT "houses_squareId_fkey" FOREIGN KEY ("squareId") REFERENCES "public"."squares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
