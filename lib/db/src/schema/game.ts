import { pgTable, text, serial, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playerRoleEnum = ["retailer", "wholesaler", "factory"] as const;
export type PlayerRole = typeof playerRoleEnum[number];

export const gameStateTable = pgTable("game_state", {
  id: serial("id").primaryKey(),
  currentDay: integer("current_day").notNull().default(1),
  currentTurnRole: text("current_turn_role").$type<PlayerRole>().notNull().default("retailer"),
  turnPhase: text("turn_phase").notNull().default("arrivals"),
  isGameOver: boolean("is_game_over").notNull().default(false),
  winnerRole: text("winner_role").$type<PlayerRole | null>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GameState = typeof gameStateTable.$inferSelect;

export const playerStateTable = pgTable("player_state", {
  id: serial("id").primaryKey(),
  role: text("role").$type<PlayerRole>().notNull().unique(),
  stock: integer("stock").notNull().default(12),
  money: numeric("money", { precision: 12, scale: 2 }).notNull().default("1000"),
  backlog: integer("backlog").notNull().default(0),
  pendingOrders: integer("pending_orders").notNull().default(0),
  totalHoldingCost: numeric("total_holding_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  totalStockoutCost: numeric("total_stockout_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PlayerState = typeof playerStateTable.$inferSelect;

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  fromRole: text("from_role").$type<PlayerRole>().notNull(),
  toRole: text("to_role").$type<PlayerRole>().notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("in_transit"),
  createdAtDay: integer("created_at_day").notNull(),
  estimatedArrivalDay: integer("estimated_arrival_day").notNull(),
  deliveredAtDay: integer("delivered_at_day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;

export const gameEventsTable = pgTable("game_events", {
  id: serial("id").primaryKey(),
  role: text("role").$type<PlayerRole>().notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  day: integer("day").notNull(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameEvent = typeof gameEventsTable.$inferSelect;

export const turnSnapshotsTable = pgTable("turn_snapshots", {
  id: serial("id").primaryKey(),
  day: integer("day").notNull(),
  retailerStock: integer("retailer_stock").notNull(),
  wholesalerStock: integer("wholesaler_stock").notNull(),
  factoryStock: integer("factory_stock").notNull(),
  retailerMoney: numeric("retailer_money", { precision: 12, scale: 2 }).notNull(),
  wholesalerMoney: numeric("wholesaler_money", { precision: 12, scale: 2 }).notNull(),
  factoryMoney: numeric("factory_money", { precision: 12, scale: 2 }).notNull(),
  retailerBacklog: integer("retailer_backlog").notNull(),
  wholesalerBacklog: integer("wholesaler_backlog").notNull(),
  factoryBacklog: integer("factory_backlog").notNull(),
  demand: integer("demand").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TurnSnapshot = typeof turnSnapshotsTable.$inferSelect;
