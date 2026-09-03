import { PrismaClient, Role, WorkOrderStatus, TransferStatus, OrderStatus, ReservationStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function seed() {
  console.log('Starting seed...')

  // Clear existing records in reverse dependency order
  await prisma.orderItem.deleteMany()
  await prisma.customerOrder.deleteMany()
  await prisma.transfer.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.item.deleteMany()
  await prisma.category.deleteMany()
  await prisma.location.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('Password123!', 10)

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      id: 'usr-admin',
      email: 'admin@example.com',
      name: 'Alex Rivera',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  const opsUser = await prisma.user.create({
    data: {
      id: 'usr-ops',
      email: 'operations@example.com',
      name: 'Casey Brooks',
      passwordHash,
      role: Role.OPERATIONS_USER,
    },
  })

  const salesUser = await prisma.user.create({
    data: {
      id: 'usr-sales',
      email: 'sales@example.com',
      name: 'Sam Patel',
      passwordHash,
      role: Role.SALES_USER,
    },
  })

  // Additional assigned users mentioned in demo data
  const jordan = await prisma.user.create({
    data: {
      id: 'usr-jordan',
      email: 'jordan.lee@example.com',
      name: 'Jordan Lee',
      passwordHash,
      role: Role.OPERATIONS_USER,
    },
  })

  const taylor = await prisma.user.create({
    data: {
      id: 'usr-taylor',
      email: 'taylor.kim@example.com',
      name: 'Taylor Kim',
      passwordHash,
      role: Role.OPERATIONS_USER,
    },
  })

  const morgan = await prisma.user.create({
    data: {
      id: 'usr-morgan',
      email: 'morgan.chen@example.com',
      name: 'Morgan Chen',
      passwordHash,
      role: Role.OPERATIONS_USER,
    },
  })

  // 2. Create Locations
  const locAustin = await prisma.location.create({
    data: {
      id: 'loc-austin',
      name: 'Austin Hub',
      code: 'AUS-01',
    },
  })

  const locReno = await prisma.location.create({
    data: {
      id: 'loc-reno',
      name: 'Reno Depot',
      code: 'RNO-01',
    },
  })

  // 3. Create Categories
  const catMotors = await prisma.category.create({ data: { id: 'cat-motors', name: 'Motors' } })
  const catControls = await prisma.category.create({ data: { id: 'cat-controls', name: 'Controls' } })
  const catSensors = await prisma.category.create({ data: { id: 'cat-sensors', name: 'Sensors' } })
  const catCabling = await prisma.category.create({ data: { id: 'cat-cabling', name: 'Cabling' } })

  // 4. Create Items
  const itemMotor = await prisma.item.create({
    data: {
      id: 'item-motor',
      sku: 'MTR-440',
      name: 'Servo Motor Assembly',
      unit: 'units',
      categoryId: catMotors.id,
    },
  })

  const itemController = await prisma.item.create({
    data: {
      id: 'item-ctl',
      sku: 'CTL-220',
      name: 'Motion Controller',
      unit: 'units',
      categoryId: catControls.id,
    },
  })

  const itemSensor = await prisma.item.create({
    data: {
      id: 'item-sns',
      sku: 'SNS-110',
      name: 'Proximity Sensor',
      unit: 'units',
      categoryId: catSensors.id,
    },
  })

  const itemCable = await prisma.item.create({
    data: {
      id: 'item-cab',
      sku: 'CAB-710',
      name: 'Shielded Cable Kit',
      unit: 'kits',
      categoryId: catCabling.id,
    },
  })

  // 5. Create Batches
  const batchMotor = await prisma.batch.create({
    data: {
      id: 'batch-mtr-04',
      batchNumber: 'B-2026-04',
      itemId: itemMotor.id,
    },
  })

  const batchController = await prisma.batch.create({
    data: {
      id: 'batch-ctl-03',
      batchNumber: 'B-2026-03',
      itemId: itemController.id,
    },
  })

  const batchSensor = await prisma.batch.create({
    data: {
      id: 'batch-sns-05',
      batchNumber: 'B-2026-05',
      itemId: itemSensor.id,
    },
  })

  const batchCable = await prisma.batch.create({
    data: {
      id: 'batch-cab-02',
      batchNumber: 'B-2026-02',
      itemId: itemCable.id,
    },
  })

  // 6. Create Inventory
  // INV-1001: Austin Hub | Servo Motor Assembly | B-2026-04 | physical: 48, reserved: 18 -> available: 30
  const inv1001 = await prisma.inventory.create({
    data: {
      id: 'INV-1001',
      itemId: itemMotor.id,
      locationId: locAustin.id,
      batchId: batchMotor.id,
      physicalQuantity: 48,
      reservedQuantity: 18,
    },
  })

  // INV-1002: Austin Hub | Motion Controller | B-2026-03 | physical: 32, reserved: 12 -> available: 20
  const inv1002 = await prisma.inventory.create({
    data: {
      id: 'INV-1002',
      itemId: itemController.id,
      locationId: locAustin.id,
      batchId: batchController.id,
      physicalQuantity: 32,
      reservedQuantity: 12,
    },
  })

  // INV-1003: Reno Depot | Proximity Sensor | B-2026-05 | physical: 140, reserved: 44 -> available: 96
  const inv1003 = await prisma.inventory.create({
    data: {
      id: 'INV-1003',
      itemId: itemSensor.id,
      locationId: locReno.id,
      batchId: batchSensor.id,
      physicalQuantity: 140,
      reservedQuantity: 44,
    },
  })

  // INV-1004: Reno Depot | Shielded Cable Kit | B-2026-02 | physical: 86, reserved: 20 -> available: 66
  const inv1004 = await prisma.inventory.create({
    data: {
      id: 'INV-1004',
      itemId: itemCable.id,
      locationId: locReno.id,
      batchId: batchCable.id,
      physicalQuantity: 86,
      reservedQuantity: 20,
    },
  })

  // Additional inventory for cross-location transfer demonstration:
  // Reno Depot has Servo Motors to transfer to Austin Hub
  await prisma.inventory.create({
    data: {
      id: 'INV-1005',
      itemId: itemMotor.id,
      locationId: locReno.id,
      physicalQuantity: 50,
      reservedQuantity: 0,
    },
  })

  // Austin Hub has Shielded Cables to transfer to Reno Depot
  await prisma.inventory.create({
    data: {
      id: 'INV-1006',
      itemId: itemCable.id,
      locationId: locAustin.id,
      physicalQuantity: 25,
      reservedQuantity: 0,
    },
  })

  // 7. Create Work Orders
  // WO-4821: Austin Hub | Servo Motor Assembly | required: 36, available: 30 -> shortage: 6!
  const wo4821 = await prisma.workOrder.create({
    data: {
      id: 'WO-4821',
      locationId: locAustin.id,
      itemId: itemMotor.id,
      requiredQuantity: 36,
      assignedUserId: jordan.id,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  })

  // WO-4818: Reno Depot | Proximity Sensor | required: 24, available: 96 -> sufficient!
  await prisma.workOrder.create({
    data: {
      id: 'WO-4818',
      locationId: locReno.id,
      itemId: itemSensor.id,
      requiredQuantity: 24,
      assignedUserId: taylor.id,
      status: WorkOrderStatus.ASSIGNED,
    },
  })

  // WO-4809: Austin Hub | Motion Controller | required: 12, available: 20 -> completed!
  await prisma.workOrder.create({
    data: {
      id: 'WO-4809',
      locationId: locAustin.id,
      itemId: itemController.id,
      requiredQuantity: 12,
      assignedUserId: morgan.id,
      status: WorkOrderStatus.COMPLETED,
    },
  })

  // 8. Create Transfers
  // TR-2008: Requested transfer of 6 Servo Motors from Reno to Austin (resolving shortage in WO-4821)
  await prisma.transfer.create({
    data: {
      id: 'TR-2008',
      sourceLocationId: locReno.id,
      destinationLocationId: locAustin.id,
      itemId: itemMotor.id,
      quantity: 6,
      requestedById: jordan.id,
      status: TransferStatus.REQUESTED,
      workOrderId: wo4821.id,
    },
  })

  // TR-2004: Dispatched transfer of 12 Shielded Cable Kits from Austin to Reno
  await prisma.transfer.create({
    data: {
      id: 'TR-2004',
      sourceLocationId: locAustin.id,
      destinationLocationId: locReno.id,
      itemId: itemCable.id,
      quantity: 12,
      requestedById: morgan.id,
      status: TransferStatus.DISPATCHED,
    },
  })

  // TR-1998: Received transfer of 20 Proximity Sensors from Reno to Austin
  await prisma.transfer.create({
    data: {
      id: 'TR-1998',
      sourceLocationId: locReno.id,
      destinationLocationId: locAustin.id,
      itemId: itemSensor.id,
      quantity: 20,
      requestedById: taylor.id,
      status: TransferStatus.RECEIVED,
    },
  })

  // 9. Customer Orders
  // CO-7730: Reserved order
  const order7730 = await prisma.customerOrder.create({
    data: {
      id: 'CO-7730',
      customer: 'Northstar Robotics',
      createdById: salesUser.id,
      status: OrderStatus.RESERVED,
    },
  })

  await prisma.orderItem.create({
    data: {
      id: 'oi-7730-1',
      customerOrderId: order7730.id,
      itemId: itemController.id,
      inventoryId: inv1002.id,
      quantity: 8,
      reservationStatus: ReservationStatus.RESERVED,
    },
  })

  // CO-7726: Pending order
  const order7726 = await prisma.customerOrder.create({
    data: {
      id: 'CO-7726',
      customer: 'Vertex Manufacturing',
      createdById: salesUser.id,
      status: OrderStatus.PENDING,
    },
  })

  await prisma.orderItem.create({
    data: {
      id: 'oi-7726-1',
      customerOrderId: order7726.id,
      itemId: itemMotor.id,
      inventoryId: inv1001.id,
      quantity: 12,
      reservationStatus: ReservationStatus.PENDING,
    },
  })

  console.log('Seed completed successfully!')
}

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error('Seed error:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
