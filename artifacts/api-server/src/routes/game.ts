import { Router } from "express";
import { db } from "@workspace/db";
import {
  gameStateTable,
  playerStateTable,
  ordersTable,
  gameEventsTable,
  turnSnapshotsTable,
  type PlayerRole,
} from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";

const router = Router();

const TURN_ORDER: PlayerRole[] = ["retailer", "wholesaler", "factory"];
const HOLDING_COST_PER_UNIT = 0.5;
const STOCKOUT_COST_PER_UNIT = 1.0;
const MIN_TRANSIT_DAYS = 2;
const MAX_TRANSIT_DAYS = 3;

function randomTransitDays(): number {
  return MIN_TRANSIT_DAYS + Math.floor(Math.random() * (MAX_TRANSIT_DAYS - MIN_TRANSIT_DAYS + 1));
}

function randomDemand(): number {
  return 4 + Math.floor(Math.random() * 5); // 4–8 units
}

function getSupplierRole(role: PlayerRole): PlayerRole | null {
  if (role === "retailer") return "wholesaler";
  if (role === "wholesaler") return "factory";
  return null;
}

async function ensureGameInitialized() {
  const states = await db.select().from(gameStateTable).limit(1);
  if (states.length === 0) {
    await db.insert(gameStateTable).values({
      currentDay: 1,
      currentTurnRole: "retailer",
      turnPhase: "arrivals",
      isGameOver: false,
    });
    for (const role of TURN_ORDER) {
      await db.insert(playerStateTable).values({
        role,
        stock: 12,
        money: "1000",
        backlog: 0,
        pendingOrders: 0,
        totalHoldingCost: "0",
        totalStockoutCost: "0",
      });
    }
  }
}

// GET /api/game/state
router.get("/game/state", async (req, res) => {
  await ensureGameInitialized();
  const [gs] = await db.select().from(gameStateTable).limit(1);
  const players = await db.select().from(playerStateTable);
  res.json({
    currentDay: gs.currentDay,
    currentTurnRole: gs.currentTurnRole,
    turnPhase: gs.turnPhase,
    isGameOver: gs.isGameOver,
    winnerRole: gs.winnerRole ?? null,
    players: players.map((p) => ({
      role: p.role,
      stock: p.stock,
      money: parseFloat(p.money),
      backlog: p.backlog,
      pendingOrders: p.pendingOrders,
      totalHoldingCost: parseFloat(p.totalHoldingCost),
      totalStockoutCost: parseFloat(p.totalStockoutCost),
    })),
  });
});

// POST /api/game/reset
router.post("/game/reset", async (req, res) => {
  await db.delete(gameEventsTable);
  await db.delete(ordersTable);
  await db.delete(turnSnapshotsTable);
  await db.delete(playerStateTable);
  await db.delete(gameStateTable);
  await ensureGameInitialized();

  const [gs] = await db.select().from(gameStateTable).limit(1);
  const players = await db.select().from(playerStateTable);
  res.json({
    currentDay: gs.currentDay,
    currentTurnRole: gs.currentTurnRole,
    turnPhase: gs.turnPhase,
    isGameOver: gs.isGameOver,
    winnerRole: gs.winnerRole ?? null,
    players: players.map((p) => ({
      role: p.role,
      stock: p.stock,
      money: parseFloat(p.money),
      backlog: p.backlog,
      pendingOrders: p.pendingOrders,
      totalHoldingCost: parseFloat(p.totalHoldingCost),
      totalStockoutCost: parseFloat(p.totalStockoutCost),
    })),
  });
});

// GET /api/game/players/:role
router.get("/game/players/:role", async (req, res) => {
  await ensureGameInitialized();
  const role = req.params.role as PlayerRole;
  if (!TURN_ORDER.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const [p] = await db.select().from(playerStateTable).where(eq(playerStateTable.role, role));
  if (!p) { res.status(404).json({ error: "Player not found" }); return; }
  res.json({
    role: p.role,
    stock: p.stock,
    money: parseFloat(p.money),
    backlog: p.backlog,
    pendingOrders: p.pendingOrders,
    totalHoldingCost: parseFloat(p.totalHoldingCost),
    totalStockoutCost: parseFloat(p.totalStockoutCost),
  });
});

// GET /api/turns/current
router.get("/turns/current", async (req, res) => {
  await ensureGameInitialized();
  const [gs] = await db.select().from(gameStateTable).limit(1);
  res.json({
    currentDay: gs.currentDay,
    currentTurnRole: gs.currentTurnRole,
    turnPhase: gs.turnPhase,
    turnOrder: TURN_ORDER,
  });
});

// POST /api/turns/advance
router.post("/turns/advance", async (req, res) => {
  await ensureGameInitialized();
  const [gs] = await db.select().from(gameStateTable).limit(1);

  const currentIndex = TURN_ORDER.indexOf(gs.currentTurnRole as PlayerRole);
  const nextIndex = currentIndex + 1;
  let nextRole: PlayerRole;
  let nextDay = gs.currentDay;

  if (nextIndex >= TURN_ORDER.length) {
    // End of day — snapshot and advance
    nextRole = TURN_ORDER[0];
    nextDay = gs.currentDay + 1;

    const players = await db.select().from(playerStateTable);
    const snap: Record<string, number | string> = { day: gs.currentDay, demand: randomDemand() };
    for (const p of players) {
      const prefix = p.role;
      snap[`${prefix}Stock`] = p.stock;
      snap[`${prefix}Money`] = parseFloat(p.money);
      snap[`${prefix}Backlog`] = p.backlog;
    }
    await db.insert(turnSnapshotsTable).values({
      day: gs.currentDay,
      retailerStock: (snap["retailerStock"] as number) ?? 0,
      wholesalerStock: (snap["wholesalerStock"] as number) ?? 0,
      factoryStock: (snap["factoryStock"] as number) ?? 0,
      retailerMoney: String(snap["retailerMoney"] ?? 0),
      wholesalerMoney: String(snap["wholesalerMoney"] ?? 0),
      factoryMoney: String(snap["factoryMoney"] ?? 0),
      retailerBacklog: (snap["retailerBacklog"] as number) ?? 0,
      wholesalerBacklog: (snap["wholesalerBacklog"] as number) ?? 0,
      factoryBacklog: (snap["factoryBacklog"] as number) ?? 0,
      demand: snap["demand"] as number,
    });
  } else {
    nextRole = TURN_ORDER[nextIndex];
  }

  await db
    .update(gameStateTable)
    .set({ currentTurnRole: nextRole, currentDay: nextDay, turnPhase: "arrivals" });

  // Generate demand event for retailer at start of their turn
  if (nextRole === "retailer") {
    const demand = randomDemand();
    await db.insert(gameEventsTable).values({
      role: "retailer",
      type: "demand",
      message: `Demanda del cliente para el Día ${nextDay}: ${demand} unidades.`,
      day: nextDay,
      acknowledged: false,
      data: { demand },
    });
  }

  const [updated] = await db.select().from(gameStateTable).limit(1);
  res.json({
    currentDay: updated.currentDay,
    currentTurnRole: updated.currentTurnRole,
    turnPhase: updated.turnPhase,
    turnOrder: TURN_ORDER,
  });
});

// POST /api/turns/process-arrivals
router.post("/turns/process-arrivals", async (req, res) => {
  await ensureGameInitialized();
  const role = req.query.role as PlayerRole;
  if (!TURN_ORDER.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [gs] = await db.select().from(gameStateTable).limit(1);
  if (gs.currentTurnRole !== role) {
    res.status(400).json({ error: "Not this player's turn" });
    return;
  }

  // Find in-transit orders arriving this day
  const arrivingOrders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.toRole, role),
        eq(ordersTable.status, "in_transit"),
      ),
    );

  const arriving = arrivingOrders.filter((o) => o.estimatedArrivalDay <= gs.currentDay);
  let totalArrived = 0;
  for (const order of arriving) {
    totalArrived += order.quantity;
    await db
      .update(ordersTable)
      .set({ status: "delivered", deliveredAtDay: gs.currentDay })
      .where(eq(ordersTable.id, order.id));
  }

  const [player] = await db.select().from(playerStateTable).where(eq(playerStateTable.role, role));
  const newStock = player.stock + totalArrived;

  // Handle backlog fulfillment
  let backlogFulfilled = 0;
  let remaining = newStock;
  if (player.backlog > 0 && remaining > 0) {
    backlogFulfilled = Math.min(player.backlog, remaining);
    remaining -= backlogFulfilled;
  }
  const newBacklog = player.backlog - backlogFulfilled;

  // Calculate holding cost
  const holdingCost = remaining * HOLDING_COST_PER_UNIT;
  const newHoldingCost = parseFloat(player.totalHoldingCost) + holdingCost;
  const newMoney = parseFloat(player.money) - holdingCost;

  await db
    .update(playerStateTable)
    .set({
      stock: remaining,
      backlog: newBacklog,
      totalHoldingCost: String(newHoldingCost),
      money: String(newMoney),
    })
    .where(eq(playerStateTable.role, role));

  await db.update(gameStateTable).set({ turnPhase: "events" });

  const events: Array<Record<string, unknown>> = [];

  if (totalArrived > 0) {
    const [ev] = await db
      .insert(gameEventsTable)
      .values({
        role,
        type: "arrival",
        message: `${totalArrived} unidades llegaron. Stock actualizado a ${remaining}.`,
        day: gs.currentDay,
        acknowledged: false,
        data: { arrived: totalArrived, newStock: remaining },
      })
      .returning();
    events.push(ev);
  }

  const [costEv] = await db
    .insert(gameEventsTable)
    .values({
      role,
      type: "cost",
      message: `Costo de almacenamiento cobrado: $${holdingCost.toFixed(2)} (${remaining} unidades × $${HOLDING_COST_PER_UNIT}).`,
      day: gs.currentDay,
      acknowledged: false,
      data: { holdingCost, units: remaining },
    })
    .returning();
  events.push(costEv);

  const [updatedPlayer] = await db.select().from(playerStateTable).where(eq(playerStateTable.role, role));

  res.json({
    arrivedQuantity: totalArrived,
    newStock: updatedPlayer.stock,
    holdingCostCharged: holdingCost,
    events: events.map((e) => ({
      id: e.id,
      role: e.role,
      type: e.type,
      message: e.message,
      day: e.day,
      acknowledged: e.acknowledged,
      data: e.data,
    })),
  });
});

// GET /api/orders
router.get("/orders", async (req, res) => {
  await ensureGameInitialized();
  const role = req.query.role as PlayerRole | undefined;
  const status = req.query.status as string | undefined;

  let query = db.select().from(ordersTable);
  const conditions = [];
  if (role) conditions.push(or(eq(ordersTable.fromRole, role), eq(ordersTable.toRole, role)));
  if (status) conditions.push(eq(ordersTable.status, status));

  const orders = await (conditions.length > 0
    ? db.select().from(ordersTable).where(and(...conditions))
    : db.select().from(ordersTable));

  res.json(
    orders.map((o) => ({
      id: o.id,
      fromRole: o.fromRole,
      toRole: o.toRole,
      quantity: o.quantity,
      status: o.status,
      createdAtDay: o.createdAtDay,
      estimatedArrivalDay: o.estimatedArrivalDay,
      deliveredAtDay: o.deliveredAtDay ?? null,
    })),
  );
});

// POST /api/orders
router.post("/orders", async (req, res) => {
  await ensureGameInitialized();
  const { fromRole, quantity } = req.body;

  if (!TURN_ORDER.includes(fromRole)) {
    res.status(400).json({ error: "Invalid fromRole" });
    return;
  }
  if (typeof quantity !== "number" || quantity < 0) {
    res.status(400).json({ error: "quantity must be a non-negative number" });
    return;
  }

  const [gs] = await db.select().from(gameStateTable).limit(1);
  if (gs.currentTurnRole !== fromRole) {
    res.status(400).json({ error: "Not this player's turn" });
    return;
  }

  const supplierRole = getSupplierRole(fromRole as PlayerRole);
  const toRole: PlayerRole = supplierRole ?? "factory";

  const transitDays = randomTransitDays();
  const estimatedArrivalDay = gs.currentDay + transitDays;

  const [order] = await db
    .insert(ordersTable)
    .values({
      fromRole: fromRole as PlayerRole,
      toRole,
      quantity,
      status: "in_transit",
      createdAtDay: gs.currentDay,
      estimatedArrivalDay,
    })
    .returning();

  // Update pending orders count for the ordering player
  const [player] = await db.select().from(playerStateTable).where(eq(playerStateTable.role, fromRole));
  await db
    .update(playerStateTable)
    .set({ pendingOrders: player.pendingOrders + 1 })
    .where(eq(playerStateTable.role, fromRole as PlayerRole));

  // Notify the supplier
  if (supplierRole) {
    await db.insert(gameEventsTable).values({
      role: supplierRole,
      type: "order_received",
      message: `${fromRole} solicitó ${quantity} unidades. Entrega estimada: Día ${estimatedArrivalDay}.`,
      day: gs.currentDay,
      acknowledged: false,
      data: { fromRole, quantity, estimatedArrivalDay },
    });
  }

  // Advance turn phase to done
  await db.update(gameStateTable).set({ turnPhase: "done" });

  res.status(201).json({
    id: order.id,
    fromRole: order.fromRole,
    toRole: order.toRole,
    quantity: order.quantity,
    status: order.status,
    createdAtDay: order.createdAtDay,
    estimatedArrivalDay: order.estimatedArrivalDay,
    deliveredAtDay: order.deliveredAtDay ?? null,
  });
});

// POST /api/orders/:id/fulfill
router.post("/orders/:id/fulfill", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [gs] = await db.select().from(gameStateTable).limit(1);
  await db
    .update(ordersTable)
    .set({ status: "delivered", deliveredAtDay: gs.currentDay })
    .where(eq(ordersTable.id, id));

  const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  res.json({
    id: updated.id,
    fromRole: updated.fromRole,
    toRole: updated.toRole,
    quantity: updated.quantity,
    status: updated.status,
    createdAtDay: updated.createdAtDay,
    estimatedArrivalDay: updated.estimatedArrivalDay,
    deliveredAtDay: updated.deliveredAtDay ?? null,
  });
});

// GET /api/events
router.get("/events", async (req, res) => {
  await ensureGameInitialized();
  const role = req.query.role as PlayerRole | undefined;
  const acknowledged = req.query.acknowledged;

  let events;
  if (role && acknowledged !== undefined) {
    events = await db
      .select()
      .from(gameEventsTable)
      .where(
        and(
          eq(gameEventsTable.role, role),
          eq(gameEventsTable.acknowledged, acknowledged === "true"),
        ),
      )
      .orderBy(desc(gameEventsTable.id));
  } else if (role) {
    events = await db
      .select()
      .from(gameEventsTable)
      .where(eq(gameEventsTable.role, role))
      .orderBy(desc(gameEventsTable.id));
  } else if (acknowledged !== undefined) {
    events = await db
      .select()
      .from(gameEventsTable)
      .where(eq(gameEventsTable.acknowledged, acknowledged === "true"))
      .orderBy(desc(gameEventsTable.id));
  } else {
    events = await db.select().from(gameEventsTable).orderBy(desc(gameEventsTable.id));
  }

  res.json(
    events.map((e) => ({
      id: e.id,
      role: e.role,
      type: e.type,
      message: e.message,
      day: e.day,
      acknowledged: e.acknowledged,
      data: e.data ?? {},
    })),
  );
});

// POST /api/events/:id/acknowledge
router.post("/events/:id/acknowledge", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [event] = await db.select().from(gameEventsTable).where(eq(gameEventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  await db
    .update(gameEventsTable)
    .set({ acknowledged: true })
    .where(eq(gameEventsTable.id, id));

  const [gs] = await db.select().from(gameEventsTable).where(eq(gameEventsTable.id, id));
  const [gameStateRow] = await db.select().from(gameStateTable).limit(1);

  // If all events for current role are acknowledged, advance phase to order
  const pendingEvents = await db
    .select()
    .from(gameEventsTable)
    .where(
      and(
        eq(gameEventsTable.role, gameStateRow.currentTurnRole as PlayerRole),
        eq(gameEventsTable.acknowledged, false),
      ),
    );

  if (pendingEvents.length === 0 && gameStateRow.turnPhase === "events") {
    await db.update(gameStateTable).set({ turnPhase: "order" });
  }

  const [updated] = await db.select().from(gameEventsTable).where(eq(gameEventsTable.id, id));
  res.json({
    id: updated.id,
    role: updated.role,
    type: updated.type,
    message: updated.message,
    day: updated.day,
    acknowledged: updated.acknowledged,
    data: updated.data ?? {},
  });
});

// GET /api/analytics/summary
router.get("/analytics/summary", async (req, res) => {
  await ensureGameInitialized();
  const [gs] = await db.select().from(gameStateTable).limit(1);
  const players = await db.select().from(playerStateTable);

  const summary: Record<string, unknown> = { totalDays: gs.currentDay };
  for (const p of players) {
    summary[p.role] = {
      stock: p.stock,
      money: parseFloat(p.money),
      backlog: p.backlog,
      totalHoldingCost: parseFloat(p.totalHoldingCost),
      totalStockoutCost: parseFloat(p.totalStockoutCost),
    };
  }

  res.json(summary);
});

// GET /api/analytics/history
router.get("/analytics/history", async (req, res) => {
  await ensureGameInitialized();
  const snapshots = await db.select().from(turnSnapshotsTable).orderBy(turnSnapshotsTable.day);
  res.json(
    snapshots.map((s) => ({
      day: s.day,
      retailerStock: s.retailerStock,
      wholesalerStock: s.wholesalerStock,
      factoryStock: s.factoryStock,
      retailerMoney: parseFloat(s.retailerMoney),
      wholesalerMoney: parseFloat(s.wholesalerMoney),
      factoryMoney: parseFloat(s.factoryMoney),
      retailerBacklog: s.retailerBacklog,
      wholesalerBacklog: s.wholesalerBacklog,
      factoryBacklog: s.factoryBacklog,
      demand: s.demand,
    })),
  );
});

// GET /api/analytics/transit
router.get("/analytics/transit", async (req, res) => {
  await ensureGameInitialized();
  const [gs] = await db.select().from(gameStateTable).limit(1);
  const transit = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.status, "in_transit"));

  res.json(
    transit.map((o) => ({
      orderId: o.id,
      fromRole: o.fromRole,
      toRole: o.toRole,
      quantity: o.quantity,
      createdAtDay: o.createdAtDay,
      estimatedArrivalDay: o.estimatedArrivalDay,
      turnsRemaining: Math.max(0, o.estimatedArrivalDay - gs.currentDay),
    })),
  );
});

export default router;
