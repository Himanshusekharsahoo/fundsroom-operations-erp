# Mini Operations ERP

A production-oriented **Operations Enterprise Resource Planning (ERP)** platform designed for stock control, production work order tracking, internal location transfers, and concurrency-safe customer order reservations.

The project implements the complete operational flow:

**Inventory → Work Order → Stock Check → Internal Transfer → Customer Order → Stock Reservation**

The application is built as a full-stack system with a TypeScript/Express backend, PostgreSQL relational database, Prisma ORM, JWT-based authentication, backend RBAC, transactional inventory operations, and a Next.js operations console.

---

## 📌 Project Overview

The Mini Operations ERP is designed around a small but realistic operations workflow where inventory accuracy and transactional consistency are critical.

The system supports:

- Multi-location inventory management
- Item, category, batch, and location relationships
- Production work orders
- Backend-authoritative stock checks
- Automatic shortage calculation
- Internal inventory transfers
- Transaction-safe dispatch and receipt operations
- Customer order creation
- Concurrency-safe stock reservations
- Transactional reservation release during cancellation
- JWT authentication
- Role-Based Access Control (RBAC)
- Input validation using Zod
- Centralized API error handling
- Automated integration, concurrency, and end-to-end tests
- OpenAPI / Swagger API documentation

---

# 🏗️ Architecture & Technology Stack

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React 19, TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide Icons |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Authentication | JWT |
| Password Hashing | bcryptjs |
| Validation | Zod |
| Testing | Jest, Supertest |
| API Documentation | OpenAPI 3.0 / Swagger UI |
| Package Manager | npm |

---

## System Architecture

```text
                         ┌─────────────────────────┐
                         │      Next.js Frontend   │
                         │   Operations Console    │
                         └────────────┬────────────┘
                                      │
                                      │ HTTP / JSON
                                      ▼
                         ┌─────────────────────────┐
                         │    Express REST API     │
                         │                         │
                         │ Auth / RBAC / Validation│
                         │ Business Logic          │
                         │ Error Handling          │
                         └────────────┬────────────┘
                                      │
                                      │ Prisma ORM
                                      ▼
                         ┌─────────────────────────┐
                         │      PostgreSQL DB      │
                         │                         │
                         │ Inventory               │
                         │ Work Orders             │
                         │ Transfers               │
                         │ Customer Orders         │
                         │ Users / Locations       │
                         └─────────────────────────┘
```

---

# 📂 Project Structure

```text
fundsroom-operations-erp/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   └── 20260903153047_init/
│   │   │       └── migration.sql
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   │
│   │   ├── docs/
│   │   │   └── swagger.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── error.ts
│   │   │   └── validate.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── transfers/
│   │   │   └── work-orders/
│   │   │
│   │   ├── utils/
│   │   │   ├── errors.ts
│   │   │   └── prisma.ts
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   │   ├── auth-rbac.test.ts
│   │   ├── concurrency.test.ts
│   │   ├── e2e-flow.test.ts
│   │   ├── inventory.test.ts
│   │   ├── orders.test.ts
│   │   ├── transfers.test.ts
│   │   └── work-orders.test.ts
│   │
│   ├── .env.example
│   ├── jest.config.js
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   └── ERD.md
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── transfers/
│   │   │   ├── work-orders/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── erp-app.tsx
│   │   └── erp-shell.tsx
│   │
│   ├── lib/
│   │   ├── erp-api.ts
│   │   ├── erp-types.ts
│   │   └── utils.ts
│   │
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

# 🗄️ Database Schema

The application uses a relational PostgreSQL database managed through Prisma ORM.

Core entities include:

- `User`
- `Location`
- `Category`
- `Item`
- `Batch`
- `Inventory`
- `WorkOrder`
- `Transfer`
- `CustomerOrder`
- `OrderItem`

The schema models relationships between users, locations, items, batches, inventory records, production work orders, transfers, and customer orders.

## Entity Relationship Diagram

The complete ER diagram and database design notes are available here:

[**View Database ER Diagram →**](docs/ERD.md)

The repository also includes the Prisma migration history required to reproduce the database schema.

---

# 🔐 Authentication & Role-Based Access Control

The backend is the security boundary of the application.

Authentication uses:

- JWT access tokens
- bcryptjs password hashing
- Protected API routes
- Role-based authorization middleware

The backend uses authentication and authorization middleware to ensure users cannot bypass frontend restrictions by directly calling APIs.

## Roles

| Role | Permissions |
|---|---|
| **ADMIN** | Full access to all modules; only role permitted to create Work Orders |
| **OPERATIONS_USER** | Inventory operations, Work Order status updates, stock checks, transfers |
| **SALES_USER** | Customer orders, inventory read access, reservations, cancellations |

### ADMIN

Can:

- View and modify inventory
- Create and manage Work Orders
- Perform Work Order status updates
- Create and manage transfers
- Dispatch and receive transfers
- Create customer orders
- Reserve stock
- Cancel orders

### OPERATIONS_USER

Can:

- View inventory
- Adjust physical stock
- View Work Orders
- Update Work Order status
- Perform stock checks
- Create transfers
- Dispatch transfers
- Receive transfers

Cannot:

- Create Work Orders
- Perform Sales operations

### SALES_USER

Can:

- Read inventory
- Create customer orders
- View customer orders
- Reserve stock
- Cancel customer orders

Cannot:

- Create or manage transfers
- Create Work Orders
- Perform restricted inventory operations

---

# 📦 Core Business Rules

## 1. Inventory Available Quantity

Available stock is calculated using:

```text
availableQuantity = physicalQuantity - reservedQuantity
```

`availableQuantity` is not independently stored as a separate source of truth.

This avoids duplicated inventory state and reduces the possibility of synchronization inconsistencies.

Example:

```text
Physical Quantity  = 100
Reserved Quantity  = 25
Available Quantity = 75
```

---

## 2. Inventory Validation

The backend prevents invalid inventory operations including:

- Negative quantities
- Zero quantities where positive quantity is required
- Reservations greater than available stock
- Transfers greater than available stock
- Invalid inventory references
- Invalid state transitions

Validation is performed on the backend rather than relying only on frontend validation.

---

# 🏭 Work Orders

A Work Order represents a production requirement for an item at a specific location.

Each Work Order contains:

- Work Order ID
- Location
- Item
- Required Quantity
- Assigned User
- Status

Supported statuses:

```text
ASSIGNED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

## Backend Stock Check

The backend calculates stock availability for the Work Order location.

```text
available =
    sum(
        physicalQuantity - reservedQuantity
    )
    for the required item at the Work Order location

shortage =
    Math.max(0, requiredQuantity - available)

hasShortage =
    shortage > 0
```

Example:

```text
Required Quantity = 500
Available Stock   = 350

Shortage = 150
```

The backend remains the authoritative source for this calculation.

---

# 🔄 Internal Transfer Lifecycle

Inventory transfers follow a strict three-step lifecycle:

```text
REQUESTED
    │
    ▼
DISPATCHED
    │
    ▼
RECEIVED
```

## 1. REQUESTED

A transfer request is created.

```text
Source inventory      → unchanged
Destination inventory → unchanged
```

No stock mutation occurs.

---

## 2. DISPATCHED

The source inventory is reduced.

```text
Source inventory      → decreases
Destination inventory → unchanged
```

The dispatched quantity must not exceed source available stock.

```text
available =
    physicalQuantity - reservedQuantity
```

---

## 3. RECEIVED

The destination inventory is increased.

```text
Source inventory      → already reduced
Destination inventory → increases
```

## Transfer Safety Rules

The backend prevents:

- Dispatching a transfer twice
- Receiving before dispatch
- Receiving a transfer twice
- Dispatching more than available source stock
- Invalid transfer state transitions

Transfer state changes and associated inventory mutations are performed transactionally.

---

# 🛒 Customer Orders & Stock Reservation

Sales users can create customer orders containing one or more order items.

An order can subsequently reserve available inventory.

The critical business requirement is:

> Two concurrent reservation requests must never cause reserved stock to exceed available stock.

---

# ⚡ Concurrency-Safe Reservation

## The Race Condition

A naive implementation might do:

```text
1. Read inventory
2. Check available stock
3. Increase reserved quantity
```

With concurrent requests:

```text
Available = 100

Request A → wants 80
Request B → wants 50
```

Both requests could read:

```text
Available = 100
```

and incorrectly succeed.

That would result in:

```text
Reserved = 130
```

which violates the inventory constraint.

---

## Atomic Conditional Update

The implementation uses an atomic conditional SQL update:

```sql
UPDATE inventory
SET "reservedQuantity" = "reservedQuantity" + $qtyToReserve,
    "updatedAt" = NOW()
WHERE id = $targetInventoryId
  AND ("physicalQuantity" - "reservedQuantity") >= $qtyToReserve;
```

The update succeeds only if sufficient available stock exists at the time of the database operation.

The application checks the number of affected rows.

```text
affectedRows = 1
    → reservation succeeded

affectedRows = 0
    → insufficient/concurrently consumed stock
```

The API returns a conflict response when the reservation cannot be completed:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_AVAILABLE_STOCK",
    "message": "Insufficient available stock."
  }
}
```

This prevents the backend from overselling inventory under concurrent requests.

---

# ❌ Order Cancellation & Reservation Release

When an order with reserved stock is cancelled, the reservation is released transactionally.

The database update follows the condition:

```sql
UPDATE inventory
SET "reservedQuantity" = "reservedQuantity" - $itemQuantity,
    "updatedAt" = NOW()
WHERE id = $inventoryId
  AND "reservedQuantity" >= $itemQuantity;
```

This prevents:

- Negative reserved quantities
- Double release of the same reservation
- Inconsistent inventory state

---

# 🧪 Testing

The backend contains **25 automated tests across 7 test suites**.

Testing covers:

### Authentication & RBAC

- Authentication requirements
- Unauthorized access
- Role restrictions
- Protected endpoints

### Inventory

- Valid stock operations
- Invalid quantities
- Negative quantity rejection
- Zero quantity validation
- Available quantity behavior

### Work Orders

- Work Order creation permissions
- Status updates
- Backend stock checking
- Shortage calculation

### Transfers

- Transfer creation
- Requested state
- Dispatch behavior
- Source stock reduction
- Destination stock remaining unchanged after dispatch
- Receipt behavior
- Double-dispatch prevention
- Double-receive prevention
- Invalid lifecycle transitions
- Insufficient source stock

### Customer Orders

- Order creation
- Stock reservation
- Overselling prevention
- Reservation conflict handling
- Order cancellation
- Reservation release

### Concurrency

The concurrency test verifies simultaneous reservation attempts against the same inventory.

Example scenario:

```text
Initial available stock = 100

Request A = reserve 80
Request B = reserve 50
```

Expected result:

```text
One request succeeds
One request returns 409 Conflict

Reserved quantity never exceeds 100
```

### End-to-End Flow

The E2E tests cover the complete operational lifecycle:

```text
Login
  ↓
Inventory
  ↓
Work Order
  ↓
Stock Check
  ↓
Transfer Request
  ↓
Transfer Dispatch
  ↓
Transfer Receipt
  ↓
Updated Inventory
  ↓
Customer Order
  ↓
Atomic Reservation
```

---

# 📡 API Reference

Base API:

```text
http://localhost:5000/api
```

Swagger UI:

```text
http://localhost:5000/api/docs
```

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user and return JWT |
| GET | `/api/auth/me` | Return authenticated user profile |

---

## Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | List inventory |
| GET | `/api/inventory/:id` | Get inventory record |
| POST | `/api/inventory` | Add physical stock |
| GET | `/api/items` | List catalog items |
| GET | `/api/locations` | List locations |
| GET | `/api/categories` | List categories |
| GET | `/api/batches` | List batches |

Inventory listing supports filtering/search based on the implemented API parameters.

---

## Work Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/work-orders` | List Work Orders |
| GET | `/api/work-orders/:id` | Get Work Order details |
| POST | `/api/work-orders` | Create Work Order |
| PATCH | `/api/work-orders/:id/status` | Update Work Order status |
| GET | `/api/work-orders/:id/stock-check` | Calculate backend-authoritative stock shortage |

---

## Internal Transfers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transfers` | List transfers |
| GET | `/api/transfers/:id` | Get transfer details |
| POST | `/api/transfers` | Create transfer request |
| POST | `/api/transfers/:id/dispatch` | Dispatch transfer |
| POST | `/api/transfers/:id/receive` | Receive transfer |

---

## Customer Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders` | List customer orders |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/orders` | Create customer order |
| POST | `/api/orders/:id/reserve` | Reserve inventory |
| POST | `/api/orders/:id/cancel` | Cancel order and release reservations |

For complete request/response schemas and interactive API testing, use the Swagger documentation.

---

# 🚀 Setup & Installation

## Prerequisites

Install:

- Node.js 20+ or 22+
- PostgreSQL 15+
- npm

Verify:

```bash
node --version
npm --version
psql --version
```

---

# ⚙️ Backend Configuration

Navigate to the backend:

```bash
cd backend
```

Create the environment file:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Configure:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fundsroom_operations_erp?schema=public"
JWT_SECRET="your-secure-jwt-secret"
JWT_EXPIRES_IN="7d"
PORT=5000
CORS_ORIGIN="http://localhost:3000"
```

> Use a strong secret for `JWT_SECRET` in real deployments. Do not commit `.env` to Git.

---

# 🗄️ Database Setup

From the backend directory:

```bash
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Seed the database:

```bash
npm run prisma:seed
```

The seed data provides records required to demonstrate the ERP workflow.

---

# ▶️ Running the Backend

From:

```text
backend/
```

Run development server:

```bash
npm run dev
```

Or build and start:

```bash
npm run build
npm start
```

Backend API:

```text
http://localhost:5000/api
```

Swagger:

```text
http://localhost:5000/api/docs
```

---

# 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create:

```text
frontend/.env.local
```

with:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Running Tests

From the backend directory:

```bash
npm test
```

The test suite contains:

```text
25 tests
7 test suites
```

The tests cover authentication, RBAC, inventory validation, Work Orders, transfers, customer orders, concurrency, and the complete business lifecycle.

---

# 👥 Demo Credentials

The seeded development database provides the following demo users:

| Role | Email | Password | Name |
|---|---|---|---|
| **Administrator** | `admin@example.com` | `Password123!` | Alex Rivera |
| **Operations User** | `operations@example.com` | `Password123!` | Casey Brooks |
| **Sales User** | `sales@example.com` | `Password123!` | Sam Patel |

These credentials are intended for local case-study demonstration only.

---

# 🎬 Recommended Demo Flow

A concise demonstration can follow this sequence:

## 1. Login

Sign in using the Administrator account.

Show:

- Authentication
- Role information
- Protected dashboard

## 2. Inventory

Open Inventory and demonstrate:

- Items
- Locations
- Batches
- Physical quantity
- Reserved quantity
- Available quantity

Explain:

```text
Available = Physical - Reserved
```

## 3. Work Order

Create a Work Order as Administrator.

Show:

- Item
- Location
- Required quantity
- Assigned user
- Status

Open the stock check and demonstrate the backend-calculated shortage.

## 4. Internal Transfer

Create a transfer.

Demonstrate:

```text
REQUESTED
    ↓
DISPATCHED
    ↓
RECEIVED
```

Important behavior:

After dispatch:

```text
Source      → decreases
Destination → unchanged
```

After receipt:

```text
Destination → increases
```

## 5. Customer Order

Create a customer order using the Sales role.

Reserve available stock.

Demonstrate that the reservation updates the available quantity.

## 6. Concurrency / Oversell Scenario

Use the automated concurrency test to demonstrate that simultaneous reservations cannot exceed available inventory.

Expected behavior:

```text
Available = 100

Reserve 80 → success
Reserve 50 → 409 Conflict

Final reserved quantity ≤ 100
```

---

# 🔒 Error Handling

The backend provides centralized error handling and meaningful HTTP responses.

Common responses include:

| Status | Meaning |
|---|---|
| `400` | Invalid request / validation error |
| `401` | Authentication required or invalid authentication |
| `403` | Authenticated but unauthorized for the operation |
| `404` | Resource not found |
| `409` | Business conflict such as insufficient stock or invalid state |
| `500` | Unexpected server error |

Validation errors are handled through Zod schemas before business operations execute.

---

# 🧠 Business Logic Design Principles

The implementation follows several important principles:

### Backend as Security Boundary

Frontend role restrictions improve UX but are not trusted for authorization.

The backend independently verifies:

```text
Authentication
+
Role
+
Business Rules
```

before executing protected operations.

### Database as Source of Truth

Inventory-critical state is controlled by PostgreSQL transactions and atomic updates.

### Avoid Duplicated State

Available quantity is derived:

```text
physicalQuantity - reservedQuantity
```

rather than maintained as an independent mutable value.

### Transactional Inventory Mutations

Operations that modify multiple related records are performed transactionally to prevent partial updates.

### Explicit State Transitions

Transfer operations follow explicit:

```text
REQUESTED → DISPATCHED → RECEIVED
```

rules rather than allowing arbitrary status changes.

### Concurrency Safety

Stock reservations use a database-level conditional update rather than relying on a read-then-write application check.

---

# 📚 Documentation

Additional documentation:

- [Database ER Diagram](docs/ERD.md)
- Interactive Swagger documentation available at `/api/docs` when the backend is running

---

# 🛡️ Environment & Repository Safety

Environment-specific configuration is stored through environment variables.

The repository contains:

```text
.env.example
```

instead of actual environment secrets.

The following should not be committed:

```text
.env
.env.local
node_modules/
.next/
dist/
coverage/
*.tsbuildinfo
```

---

# 📋 Case Study Requirement Coverage

| Requirement | Implementation |
|---|---|
| Authentication | JWT + bcryptjs |
| Backend Authorization | JWT authentication + RBAC middleware |
| Admin Role | Full operational access |
| Operations Role | Inventory, Work Orders, transfers |
| Sales Role | Orders and reservations |
| Inventory | Physical + reserved + derived available quantity |
| Work Orders | Creation, assignment, status, stock check |
| Shortage Calculation | Backend-authoritative calculation |
| Transfers | Requested → Dispatched → Received |
| Dispatch Stock Logic | Source decreases |
| Receive Stock Logic | Destination increases |
| Double Receipt Prevention | Backend state validation |
| Customer Orders | Order creation and management |
| Stock Reservation | Atomic conditional database update |
| Oversell Prevention | Database-level concurrency control |
| Cancellation | Transactional reservation release |
| Input Validation | Zod |
| Error Handling | Centralized middleware |
| Database | PostgreSQL + Prisma |
| Migrations | Prisma migrations |
| Testing | Jest + Supertest |
| Concurrency Testing | Dedicated concurrency test |
| E2E Testing | Complete business lifecycle test |
| API Documentation | Swagger / OpenAPI |
| ER Diagram | `docs/ERD.md` |
| Frontend | Next.js operations console |

---

# 🔮 Future Improvements

Potential production extensions include:

- Audit logs for inventory mutations
- Pagination for large datasets
- Advanced inventory movement history
- Purchase orders and supplier management
- Production consumption / material issue workflows
- Approval workflows
- More granular permissions
- Refresh-token based authentication
- Automated CI/CD pipeline
- Dockerized deployment
- Observability and structured application logging
- Expanded API and frontend test coverage

---

# 📄 License

This project was developed as a technical case-study implementation and is intended for evaluation and demonstration purposes.
