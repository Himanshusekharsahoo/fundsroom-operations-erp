# Fundsroom Mini Operations ERP — Entity-Relationship Diagram (ERD)

This document describes the relational database schema implemented for the Fundsroom Mini Operations ERP, matching the authoritative Prisma schema in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ WorkOrder : "assignedWorkOrders"
    User ||--o{ Transfer : "transfersRequested"
    User ||--o{ CustomerOrder : "customerOrders"

    Location ||--o{ Inventory : "inventory"
    Location ||--o{ WorkOrder : "workOrders"
    Location ||--o{ Transfer : "transfersAsSource"
    Location ||--o{ Transfer : "transfersAsDest"

    Category ||--o{ Item : "items"

    Item ||--o{ Batch : "batches"
    Item ||--o{ Inventory : "inventory"
    Item ||--o{ WorkOrder : "workOrders"
    Item ||--o{ Transfer : "transfers"
    Item ||--o{ OrderItem : "orderItems"

    Batch ||--o{ Inventory : "inventory"

    WorkOrder ||--o{ Transfer : "transfers"

    CustomerOrder ||--|{ OrderItem : "items"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        Role role
        datetime createdAt
        datetime updatedAt
    }

    Location {
        string id PK
        string name UK
        string code UK
        datetime createdAt
        datetime updatedAt
    }

    Category {
        string id PK
        string name UK
        datetime createdAt
        datetime updatedAt
    }

    Item {
        string id PK
        string sku UK
        string name
        string unit
        string categoryId FK
        datetime createdAt
        datetime updatedAt
    }

    Batch {
        string id PK
        string batchNumber
        string itemId FK
        datetime expiryDate
        datetime createdAt
        datetime updatedAt
    }

    Inventory {
        string id PK
        string itemId FK
        string locationId FK
        string batchId FK "optional"
        int physicalQuantity
        int reservedQuantity
        datetime createdAt
        datetime updatedAt
    }

    WorkOrder {
        string id PK
        string locationId FK
        string itemId FK
        int requiredQuantity
        string assignedUserId FK
        WorkOrderStatus status
        datetime createdAt
        datetime updatedAt
    }

    Transfer {
        string id PK
        string sourceLocationId FK
        string destinationLocationId FK
        string itemId FK
        int quantity
        string requestedById FK
        TransferStatus status
        string workOrderId FK "optional"
        datetime createdAt
        datetime updatedAt
    }

    CustomerOrder {
        string id PK
        string customer
        string createdById FK
        OrderStatus status
        datetime createdAt
        datetime updatedAt
    }

    OrderItem {
        string id PK
        string customerOrderId FK
        string itemId FK
        string inventoryId FK "optional"
        int quantity
        ReservationStatus reservationStatus
        datetime createdAt
        datetime updatedAt
    }
```

---

## 2. Database Design Notes

- **Datasource & ORM**: PostgreSQL is the configured relational database provider, accessed via Prisma ORM (`backend/prisma/schema.prisma`).
- **Available Quantity Calculation**: `availableQuantity` is never stored as an independent column to prevent synchronization anomalies; it is dynamically calculated as:
  $$\text{availableQuantity} = \text{physicalQuantity} - \text{reservedQuantity}$$
- **Inventory Uniqueness**: `Inventory` enforces a compound unique constraint across `[itemId, locationId, batchId]`, ensuring exactly one inventory ledger record per item, location, and optional batch combination.
- **Item Uniqueness**: `Item.sku` is strictly unique (`@unique`).
- **Location Uniqueness**: Both `Location.name` and `Location.code` are individually unique (`@unique`).
- **Batch Uniqueness**: `Batch` enforces a compound unique constraint across `[itemId, batchNumber]`.
- **Customer Order Line Items**: `CustomerOrder` maintains a 1-to-many relationship with `OrderItem` (`items OrderItem[]`) with `onDelete: Cascade`.
- **Optional Inventory Association**: `OrderItem.inventoryId` is an optional reference (`String?`), populated when specific stock allocation occurs.
- **Dual Location Transfer Relations**: `Transfer` models distinct source and destination relationships pointing to `Location` (`sourceLocationId` via `TransferSource` and `destinationLocationId` via `TransferDestination`).
- **Relational Integrity & Indexes**: Foreign keys are indexed (`@@index`) on all join fields (`categoryId`, `locationId`, `itemId`, `assignedUserId`, `sourceLocationId`, `destinationLocationId`, `requestedById`, `customerOrderId`) to guarantee high-performance queries and referential integrity.
- **Enums**:
  - `Role`: `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
  - `WorkOrderStatus`: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`
  - `TransferStatus`: `REQUESTED`, `DISPATCHED`, `RECEIVED`
  - `OrderStatus`: `DRAFT`, `PENDING`, `RESERVED`, `CANCELLED`, `COMPLETED`
  - `ReservationStatus`: `PENDING`, `RESERVED`, `RELEASED`
