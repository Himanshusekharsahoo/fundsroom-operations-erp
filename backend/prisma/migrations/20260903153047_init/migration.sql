-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATIONS_USER', 'SALES_USER');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'DISPATCHED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'RESERVED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'RESERVED', 'RELEASED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATIONS_USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchId" TEXT,
    "physicalQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requiredQuantity" INTEGER NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "workOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_orders" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "customerOrderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "inventoryId" TEXT,
    "quantity" INTEGER NOT NULL,
    "reservationStatus" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "items_sku_key" ON "items"("sku");

-- CreateIndex
CREATE INDEX "items_categoryId_idx" ON "items"("categoryId");

-- CreateIndex
CREATE INDEX "batches_itemId_idx" ON "batches"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_itemId_batchNumber_key" ON "batches"("itemId", "batchNumber");

-- CreateIndex
CREATE INDEX "inventory_itemId_idx" ON "inventory"("itemId");

-- CreateIndex
CREATE INDEX "inventory_locationId_idx" ON "inventory"("locationId");

-- CreateIndex
CREATE INDEX "inventory_batchId_idx" ON "inventory"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_itemId_locationId_batchId_key" ON "inventory"("itemId", "locationId", "batchId");

-- CreateIndex
CREATE INDEX "work_orders_locationId_idx" ON "work_orders"("locationId");

-- CreateIndex
CREATE INDEX "work_orders_itemId_idx" ON "work_orders"("itemId");

-- CreateIndex
CREATE INDEX "work_orders_assignedUserId_idx" ON "work_orders"("assignedUserId");

-- CreateIndex
CREATE INDEX "transfers_sourceLocationId_idx" ON "transfers"("sourceLocationId");

-- CreateIndex
CREATE INDEX "transfers_destinationLocationId_idx" ON "transfers"("destinationLocationId");

-- CreateIndex
CREATE INDEX "transfers_itemId_idx" ON "transfers"("itemId");

-- CreateIndex
CREATE INDEX "transfers_requestedById_idx" ON "transfers"("requestedById");

-- CreateIndex
CREATE INDEX "transfers_workOrderId_idx" ON "transfers"("workOrderId");

-- CreateIndex
CREATE INDEX "customer_orders_createdById_idx" ON "customer_orders"("createdById");

-- CreateIndex
CREATE INDEX "order_items_customerOrderId_idx" ON "order_items"("customerOrderId");

-- CreateIndex
CREATE INDEX "order_items_itemId_idx" ON "order_items"("itemId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
