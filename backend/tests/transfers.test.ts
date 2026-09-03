import request from 'supertest'
import { app } from '../src/app'
import { getAuthTokens } from './helpers'
import { prisma } from '../src/utils/prisma'

describe('Transfers Test Suite', () => {
  let tokens: { adminToken: string; opsToken: string; salesToken: string }

  beforeAll(async () => {
    tokens = await getAuthTokens()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // Mandatory Test 2: Cannot transfer more than available inventory
  it('cannot dispatch transfer for more than available source inventory', async () => {
    // Create a transfer with quantity exceeding available stock (e.g. 9999)
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        item: 'Servo Motor Assembly',
        quantity: 9999,
        from: 'Austin Hub',
        to: 'Reno Depot',
      })

    expect(createRes.status).toBe(201)
    const transferId = createRes.body.data.id

    // Attempt to dispatch
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(dispatchRes.status).toBe(409)
    expect(dispatchRes.body.success).toBe(false)
    expect(dispatchRes.body.error.code).toBe('INSUFFICIENT_AVAILABLE_STOCK')
  })

  // Mandatory Test 3: Destination stock does NOT increase when transfer is only DISPATCHED
  // & Mandatory Test 4: Destination stock increases only after RECEIVED
  it('correctly manages inventory lifecycle: source decreases upon dispatch, destination increases only upon receive', async () => {
    // Step A: Check initial destination stock of Shielded Cable Kit at Austin Hub
    const cablesAustinBefore = await prisma.inventory.findFirst({
      where: {
        itemId: 'item-cab',
        locationId: 'loc-austin',
      },
    })
    const destInitialPhysical = cablesAustinBefore?.physicalQuantity || 0

    // Check initial source stock of Shielded Cable Kit at Reno Depot
    const cablesRenoBefore = await prisma.inventory.findFirst({
      where: {
        itemId: 'item-cab',
        locationId: 'loc-reno',
      },
    })
    const sourceInitialPhysical = cablesRenoBefore!.physicalQuantity

    // Step B: Create a transfer of 10 cables from Reno Depot to Austin Hub
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        item: 'Shielded Cable Kit',
        quantity: 10,
        from: 'Reno Depot',
        to: 'Austin Hub',
      })

    expect(createRes.status).toBe(201)
    const transferId = createRes.body.data.id
    expect(createRes.body.data.status).toBe('REQUESTED')

    // Step C: Verify stock did NOT change in REQUESTED state
    const cablesRenoRequested = await prisma.inventory.findFirst({
      where: { itemId: 'item-cab', locationId: 'loc-reno' },
    })
    expect(cablesRenoRequested!.physicalQuantity).toBe(sourceInitialPhysical)

    // Step D: Dispatch transfer
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(dispatchRes.status).toBe(200)
    expect(dispatchRes.body.data.status).toBe('DISPATCHED')

    // Source inventory MUST decrease
    const cablesRenoDispatched = await prisma.inventory.findFirst({
      where: { itemId: 'item-cab', locationId: 'loc-reno' },
    })
    expect(cablesRenoDispatched!.physicalQuantity).toBe(sourceInitialPhysical - 10)

    // Mandatory Test 3: Destination inventory MUST NOT increase when only DISPATCHED
    const cablesAustinDispatched = await prisma.inventory.findFirst({
      where: { itemId: 'item-cab', locationId: 'loc-austin' },
    })
    expect(cablesAustinDispatched?.physicalQuantity || 0).toBe(destInitialPhysical)

    // Step E: Cannot dispatch again
    const doubleDispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
    expect(doubleDispatchRes.status).toBe(409)

    // Step F: Receive transfer
    // Mandatory Test 4: Destination stock increases only after RECEIVED
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(receiveRes.status).toBe(200)
    expect(receiveRes.body.data.status).toBe('RECEIVED')

    const cablesAustinReceived = await prisma.inventory.findFirst({
      where: { itemId: 'item-cab', locationId: 'loc-austin' },
    })
    expect(cablesAustinReceived!.physicalQuantity).toBe(destInitialPhysical + 10)

    // Mandatory Test 5: Same transfer cannot be received twice
    const doubleReceiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)

    expect(doubleReceiveRes.status).toBe(409)
    expect(doubleReceiveRes.body.success).toBe(false)
  })

  it('cannot receive a transfer before it is dispatched', async () => {
    // Create new requested transfer
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${tokens.opsToken}`)
      .send({
        item: 'Motion Controller',
        quantity: 2,
        from: 'Austin Hub',
        to: 'Reno Depot',
      })

    const transferId = createRes.body.data.id

    // Attempt receive directly on REQUESTED transfer
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${tokens.opsToken}`)

    expect(receiveRes.status).toBe(409)
    expect(receiveRes.body.error.code).toBe('INVALID_TRANSFER_STATE')
  })
})
