var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import "dotenv/config";
import crypto2 from "node:crypto";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

// src/middleware/auth.ts
import crypto from "node:crypto";

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "knowledgeable-stream-g7cdj",
  appId: "1:708339516631:web:9f4d6de3f6d0fbe797dc92",
  apiKey: "AIzaSyAli9KzUS9HSxtBovd722wmV2lQ2XbSO30",
  authDomain: "knowledgeable-stream-g7cdj.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-meridianvoyages-a9572afd-f5cc-4933-ae99-9757c8750a5c",
  storageBucket: "knowledgeable-stream-g7cdj.firebasestorage.app",
  messagingSenderId: "708339516631",
  measurementId: "",
  oAuthClientId: "708339516631-okvn88lp3rcgutlh4iku7hr7p9r3r85l.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!getApps().length) {
  initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = getAuth();

// src/middleware/auth.ts
var OWNER_EMAIL = "hiremathsiddu@gmail.com";
var SESSION_SECRET = process.env.SESSION_SECRET || `meridian-${process.env.SQL_DB_NAME || "local"}-portal-key`;
function signSessionToken(payload) {
  const full = {
    ...payload,
    exp: Date.now() + 1e3 * 60 * 60 * 24 * 7
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}
function verifySessionToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const session = verifySessionToken(token);
  if (session) {
    req.sessionUser = session;
    return next();
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();
    req.sessionUser = {
      uid: decoded.uid,
      email,
      name: decoded.name || email.split("@")[0] || "Traveler",
      role: email === OWNER_EMAIL ? "owner" : "customer",
      exp: Date.now() + 1e3 * 60 * 60
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
var requireOwner = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (!req.sessionUser || req.sessionUser.role !== "owner" || req.sessionUser.email.toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: "Forbidden: Owner access required" });
    }
    next();
  });
};

// src/db/repository.ts
import { and, desc, eq } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookings: () => bookings,
  destinations: () => destinations,
  expenses: () => expenses,
  inquiries: () => inquiries,
  users: () => users
});
import {
  bigint,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow()
});
var bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  packageSlug: text("package_slug").notNull(),
  packageTitle: text("package_title").notNull(),
  destination: text("destination").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  departureDate: text("departure_date").notNull(),
  guests: bigint("guests", { mode: "number" }).notNull(),
  tier: text("tier").notNull(),
  revenue: bigint("revenue", { mode: "number" }).notNull(),
  cost: bigint("cost", { mode: "number" }).notNull(),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow()
});
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  entryType: text("entry_type").notNull().default("expense"),
  packageSlug: text("package_slug").notNull().default("general"),
  recordedDate: text("recorded_date").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  companyOrName: text("company_or_name").notNull(),
  email: text("email").notNull(),
  destination: text("destination").notNull(),
  groupSize: bigint("group_size", { mode: "number" }).notNull(),
  details: text("details").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow()
});
var destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  days: integer("days").notNull(),
  nights: integer("nights").notNull(),
  maxGuests: integer("max_guests").notNull(),
  basePrice: integer("base_price").notNull(),
  privateUpgrade: integer("private_upgrade").notNull(),
  season: text("season").notNull(),
  rating: text("rating").notNull().default("5.0"),
  summary: text("summary").notNull(),
  image: text("image").notNull(),
  highlights: jsonb("highlights").$type().notNull(),
  included: jsonb("included").$type().notNull(),
  departures: jsonb("departures").$type().notNull(),
  itinerary: jsonb("itinerary").$type().notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/repository.ts
async function upsertUser(uid, email, name, role) {
  try {
    const result = await db.insert(users).values({ uid, email, name, role }).onConflictDoUpdate({
      target: users.uid,
      set: { email, name, role }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database upsertUser failed:", error);
    throw new Error("Unable to save user profile.", { cause: error });
  }
}
async function createBookingRecord(input) {
  try {
    const result = await db.insert(bookings).values({
      reference: input.reference,
      packageSlug: input.packageSlug,
      packageTitle: input.packageTitle,
      destination: input.destination,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      departureDate: input.departureDate,
      guests: input.guests,
      tier: input.tier,
      revenue: input.revenue,
      cost: input.cost,
      status: "confirmed",
      notes: input.notes || ""
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database createBookingRecord failed:", error);
    throw new Error("Unable to create booking.", { cause: error });
  }
}
async function getBookingsByCustomerEmail(email) {
  try {
    return await db.select().from(bookings).where(eq(bookings.customerEmail, email.toLowerCase())).orderBy(desc(bookings.id));
  } catch (error) {
    console.error("Database getBookingsByCustomerEmail failed:", error);
    throw new Error("Unable to load customer bookings.", { cause: error });
  }
}
async function cancelCustomerBookingRecord(id, customerEmail) {
  try {
    const existing = await db.select().from(bookings).where(
      and(
        eq(bookings.id, id),
        eq(bookings.customerEmail, customerEmail.toLowerCase())
      )
    );
    if (existing.length === 0) {
      return { notFound: true };
    }
    if (existing[0].status === "cancelled" || existing[0].status === "refunded") {
      return { alreadyCancelled: true, booking: existing[0] };
    }
    const updated = await db.update(bookings).set({ status: "cancelled" }).where(
      and(
        eq(bookings.id, id),
        eq(bookings.customerEmail, customerEmail.toLowerCase())
      )
    ).returning();
    return { booking: updated[0] };
  } catch (error) {
    console.error("Database cancelCustomerBookingRecord failed:", error);
    throw new Error("Unable to cancel booking.", { cause: error });
  }
}
async function createInquiryRecord(input) {
  try {
    const result = await db.insert(inquiries).values({
      reference: input.reference,
      companyOrName: input.companyOrName,
      email: input.email.toLowerCase(),
      destination: input.destination,
      groupSize: input.groupSize,
      details: input.details,
      status: "open"
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database createInquiryRecord failed:", error);
    throw new Error("Unable to submit inquiry.", { cause: error });
  }
}
async function getCustomDestinations() {
  try {
    const rows = await db.select().from(destinations).orderBy(desc(destinations.id));
    return rows.map((row) => ({
      ...row,
      isCustom: true
    }));
  } catch (error) {
    console.error("Database getCustomDestinations failed:", error);
    throw new Error("Unable to load custom destinations.", { cause: error });
  }
}
async function createCustomDestination(input) {
  try {
    const existing = await db.select({ id: destinations.id }).from(destinations).where(eq(destinations.slug, input.slug));
    const finalSlug = existing.length > 0 ? `${input.slug}-${Math.floor(100 + Math.random() * 900)}` : input.slug;
    const result = await db.insert(destinations).values({
      ...input,
      slug: finalSlug
    }).returning();
    return {
      ...result[0],
      isCustom: true
    };
  } catch (error) {
    console.error("Database createCustomDestination failed:", error);
    throw new Error("Unable to save new destination.", { cause: error });
  }
}
async function deleteCustomDestination(id) {
  try {
    const deleted = await db.delete(destinations).where(eq(destinations.id, id)).returning();
    return deleted[0] || null;
  } catch (error) {
    console.error("Database deleteCustomDestination failed:", error);
    throw new Error("Unable to delete destination.", { cause: error });
  }
}
async function getOwnerDashboardData() {
  try {
    const [allBookings, allExpenses, allInquiries, allUsers, customDestinations] = await Promise.all([
      db.select().from(bookings).orderBy(desc(bookings.id)),
      db.select().from(expenses).orderBy(desc(expenses.id)),
      db.select().from(inquiries).orderBy(desc(inquiries.id)),
      db.select().from(users),
      db.select().from(destinations).orderBy(desc(destinations.id))
    ]);
    let grossEarnings = 0;
    let confirmedRevenue = 0;
    let pendingRevenue = 0;
    let supplierCosts = 0;
    let bookingLosses = 0;
    let totalGuests = 0;
    const packageMap = /* @__PURE__ */ new Map();
    for (const b of allBookings) {
      if (b.status === "refunded" || b.status === "cancelled") {
        const lossAmt = Math.max(450, Math.round(b.cost * 0.28));
        bookingLosses += lossAmt;
      } else {
        grossEarnings += b.revenue;
        supplierCosts += b.cost;
        totalGuests += b.guests;
        if (b.status === "confirmed") confirmedRevenue += b.revenue;
        if (b.status === "pending") pendingRevenue += b.revenue;
      }
      const existing = packageMap.get(b.packageSlug) || {
        packageSlug: b.packageSlug,
        packageTitle: b.packageTitle,
        destination: b.destination,
        bookingsCount: 0,
        guests: 0,
        revenue: 0,
        cost: 0,
        profit: 0
      };
      if (b.status !== "refunded" && b.status !== "cancelled") {
        existing.bookingsCount += 1;
        existing.guests += b.guests;
        existing.revenue += b.revenue;
        existing.cost += b.cost;
        existing.profit += b.revenue - b.cost;
      }
      packageMap.set(b.packageSlug, existing);
    }
    let operatingExpenses = 0;
    let recordedLosses = 0;
    for (const e of allExpenses) {
      if (e.entryType === "loss") {
        recordedLosses += e.amount;
      } else {
        operatingExpenses += e.amount;
      }
    }
    const totalLosses = recordedLosses + bookingLosses;
    const totalOutflow = supplierCosts + operatingExpenses + totalLosses;
    const netProfit = grossEarnings - totalOutflow;
    const profitMarginPct = grossEarnings > 0 ? Number((netProfit / grossEarnings * 100).toFixed(1)) : 0;
    return {
      summary: {
        grossEarnings,
        confirmedRevenue,
        pendingRevenue,
        supplierCosts,
        operatingExpenses,
        totalLosses,
        netProfit,
        profitMarginPct,
        totalBookings: allBookings.length,
        activeBookings: allBookings.filter(
          (b) => b.status === "confirmed" || b.status === "pending"
        ).length,
        totalGuests,
        openInquiries: allInquiries.filter((i) => i.status === "open").length,
        registeredCustomers: allUsers.filter((u) => u.role === "customer").length
      },
      packageBreakdown: Array.from(packageMap.values()).sort(
        (a, b) => b.profit - a.profit
      ),
      bookings: allBookings,
      expenses: allExpenses,
      inquiries: allInquiries,
      customDestinations: customDestinations.map((d) => ({
        ...d,
        isCustom: true
      }))
    };
  } catch (error) {
    console.error("Database getOwnerDashboardData failed:", error);
    throw new Error("Unable to load owner financial dashboard.", {
      cause: error
    });
  }
}
async function updateBookingStatusRecord(id, status) {
  try {
    const result = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error("Database updateBookingStatusRecord failed:", error);
    throw new Error("Unable to update booking status.", { cause: error });
  }
}
async function addExpenseRecord(input) {
  try {
    const result = await db.insert(expenses).values(input).returning();
    return result[0];
  } catch (error) {
    console.error("Database addExpenseRecord failed:", error);
    throw new Error("Unable to record financial entry.", { cause: error });
  }
}
async function updateInquiryStatusRecord(id, status) {
  try {
    const result = await db.update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error("Database updateInquiryStatusRecord failed:", error);
    throw new Error("Unable to update inquiry status.", { cause: error });
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var PACKAGE_CATALOG_SUMMARY = `
Meridian Voyages Curated Packages:
1. Santorini Caldera Escape (Greece, Europe) - 6 Days / 5 Nights, Max 8 guests, $2,890/guest (+$740 Private tier), Best May-Oct. Oia suites, private sunset catamaran, volcanic vineyard.
2. Kyoto Autumn Sanctuary (Japan, Asia) - 7 Days / 6 Nights, Max 6 guests, $3,650/guest (+$920 Private tier), Best Oct-Dec. Early temple access, tea ceremony, cedar onsen ryokan, Shinkansen.
3. Swiss Alps Glacier Express (Switzerland, Europe) - 5 Days / 4 Nights, Max 10 guests, $3,420/guest (+$850 Private tier), Year-Round. Excellence Class Glacier Express, Gornergrat Matterhorn sunrise, Zermatt lodge.
4. Bali Ubud Cliffside Retreat (Indonesia, Asia) - 7 Days / 6 Nights, Max 8 guests, $2,480/guest (+$620 Private tier), Best Apr-Oct. Bamboo jungle villa, Mount Batur hike, Uluwatu cliffs.
5. Iceland Northern Lights Fjord (Iceland, Nordics) - 6 Days / 5 Nights, Max 8 guests, $3,790/guest (+$890 Private tier), Best Sep-Mar. Glass-roof aurora cabins, super-jeep hunt, blue-ice glacier cave.
6. Amalfi Coast Private Charter (Italy, Europe) - 5 Days / 4 Nights, Max 6 guests, $3,240/guest (+$790 Private tier), Best May-Oct. Positano cliffside suites, Riva Aquarama boat to Capri, Ravello gardens.
`;
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.post("/api/auth/customer", async (req, res) => {
    try {
      const rawEmail = String(req.body?.email || "").trim().toLowerCase();
      const rawName = String(req.body?.name || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      if (rawEmail === OWNER_EMAIL) {
        return res.status(403).json({
          error: "This email is reserved for the Owner Console. Switch to Owner Login and enter your owner password."
        });
      }
      const displayName = rawName || rawEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const uid = `customer:${rawEmail}`;
      await upsertUser(uid, rawEmail, displayName, "customer");
      const user = { uid, email: rawEmail, name: displayName, role: "customer" };
      const token = signSessionToken(user);
      return res.json({ token, user });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Customer sign-in failed.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/auth/owner", async (req, res) => {
    try {
      const rawEmail = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "").trim();
      if (rawEmail !== OWNER_EMAIL || password !== "1518") {
        return res.status(401).json({
          error: "Invalid owner credentials. Only the authorized owner account and passcode are accepted."
        });
      }
      const uid = `owner:${OWNER_EMAIL}`;
      const name = "Siddharth Hiremath";
      await upsertUser(uid, OWNER_EMAIL, name, "owner");
      const user = { uid, email: OWNER_EMAIL, name, role: "owner" };
      const token = signSessionToken(user);
      return res.json({ token, user });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Owner sign-in failed.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/auth/google", requireAuth, async (req, res) => {
    try {
      const user = req.sessionUser;
      await upsertUser(user.uid, user.email, user.name, user.role);
      const token = signSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role
      });
      return res.json({ user, token });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to sync user.";
      return res.status(500).json({ error: msg });
    }
  });
  app.get("/api/auth/me", requireAuth, (req, res) => {
    return res.json({ user: req.sessionUser });
  });
  app.get("/api/health", async (_req, res) => {
    try {
      await getCustomDestinations();
      return res.json({ status: "ok" });
    } catch {
      return res.status(503).json({ status: "degraded" });
    }
  });
  app.get("/api/packages", async (_req, res) => {
    try {
      const packages = await getCustomDestinations();
      return res.json({ packages });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to load destinations.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/bookings", async (req, res) => {
    try {
      const {
        packageSlug,
        packageTitle,
        destination,
        customerName,
        customerEmail,
        departureDate,
        guests,
        tier,
        unitPrice,
        notes
      } = req.body || {};
      const cleanSlug = String(packageSlug || "").trim();
      const cleanName = String(customerName || "").trim();
      const cleanEmail = String(customerEmail || "").trim().toLowerCase();
      const cleanDeparture = String(departureDate || "").trim();
      if (!cleanSlug || !cleanName || !cleanEmail || !cleanDeparture) {
        return res.status(400).json({ error: "Please complete your name, email, and departure date." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const rawGuests = Number(guests);
      const guestCount = Number.isFinite(rawGuests) ? Math.max(1, Math.min(1e9, Math.round(rawGuests))) : 1;
      const rawPrice = Number(unitPrice);
      const perGuest = Number.isFinite(rawPrice) ? Math.max(100, Math.min(1e6, Math.round(rawPrice))) : 2500;
      const revenue = Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.round(perGuest * guestCount)
      );
      const cost = Math.min(
        Number.MAX_SAFE_INTEGER,
        Math.round(revenue * 0.62)
      );
      const reference = `MV-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
      const created = await createBookingRecord({
        reference,
        packageSlug: cleanSlug,
        packageTitle: String(packageTitle || cleanSlug).trim(),
        destination: String(destination || "Global").trim(),
        customerName: cleanName,
        customerEmail: cleanEmail,
        departureDate: cleanDeparture,
        guests: guestCount,
        tier: tier === "private" ? "private" : "signature",
        revenue,
        cost,
        notes: String(notes || "").trim()
      });
      return res.status(201).json({ booking: created });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save booking.";
      return res.status(500).json({ error: msg });
    }
  });
  app.get("/api/my-bookings", requireAuth, async (req, res) => {
    try {
      const rows = await getBookingsByCustomerEmail(req.sessionUser.email);
      return res.json({ bookings: rows });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load trips.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/my-bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid booking ID." });
      }
      const outcome = await cancelCustomerBookingRecord(
        id,
        req.sessionUser.email
      );
      if ("notFound" in outcome) {
        return res.status(404).json({ error: "Booking not found for this account." });
      }
      if ("alreadyCancelled" in outcome) {
        return res.status(400).json({ error: "This trip is already cancelled." });
      }
      return res.json({ booking: outcome.booking });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to cancel trip.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/inquiries", async (req, res) => {
    try {
      const { companyOrName, email, destination, groupSize, details } = req.body || {};
      const cleanCompany = String(companyOrName || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanDest = String(destination || "").trim();
      if (!cleanCompany || !cleanEmail || !cleanDest) {
        return res.status(400).json({ error: "Please complete all required fields." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const rawGroupSize = Number(groupSize);
      const cleanGroupSize = Number.isFinite(rawGroupSize) ? Math.max(1, Math.min(1e9, Math.round(rawGroupSize))) : 1;
      const reference = `INQ-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
      const created = await createInquiryRecord({
        reference,
        companyOrName: cleanCompany,
        email: cleanEmail,
        destination: cleanDest,
        groupSize: cleanGroupSize,
        details: String(details || "").trim()
      });
      return res.status(201).json({ inquiry: created });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to submit inquiry.";
      return res.status(500).json({ error: msg });
    }
  });
  app.get("/api/owner/dashboard", requireOwner, async (_req, res) => {
    try {
      const data = await getOwnerDashboardData();
      return res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Dashboard unavailable.";
      return res.status(500).json({ error: msg });
    }
  });
  app.patch("/api/owner/bookings/:id", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || "").trim();
      if (!id || !["confirmed", "pending", "refunded", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid booking update." });
      }
      const updated = await updateBookingStatusRecord(id, status);
      return res.json({ booking: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Update failed.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/owner/expenses", requireOwner, async (req, res) => {
    try {
      const { title, category, amount, entryType, packageSlug, recordedDate } = req.body || {};
      const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
      if (!title || !category || parsedAmount <= 0) {
        return res.status(400).json({ error: "Title, category, and positive amount are required." });
      }
      const created = await addExpenseRecord({
        title: String(title).trim(),
        category: String(category).trim(),
        amount: parsedAmount,
        entryType: entryType === "loss" ? "loss" : "expense",
        packageSlug: String(packageSlug || "general"),
        recordedDate: String(recordedDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10))
      });
      return res.status(201).json({ expense: created });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to log entry.";
      return res.status(500).json({ error: msg });
    }
  });
  app.patch("/api/owner/inquiries/:id", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || "").trim();
      if (!id || !["open", "quoted", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid inquiry status." });
      }
      const updated = await updateInquiryStatusRecord(id, status);
      return res.json({ inquiry: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Update failed.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/owner/packages", requireOwner, async (req, res) => {
    try {
      const b = req.body || {};
      const title = String(b.title || "").trim();
      const location = String(b.location || "").trim();
      const country = String(b.country || "").trim();
      const region = String(b.region || "Europe").trim();
      const summary = String(b.summary || "").trim();
      const image = String(b.image || "").trim();
      const season = String(b.season || "Year-Round").trim();
      const rating = String(b.rating || "5.0").trim();
      if (!title || !location || !country || !summary || !image) {
        return res.status(400).json({
          error: "Title, location, country, summary, and a destination photo are required."
        });
      }
      const rawSlug = String(b.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const slug = rawSlug || `destination-${Date.now()}`;
      const days = Math.max(1, Math.round(Number(b.days) || 5));
      const nights = Math.max(0, Math.round(Number(b.nights) ?? days - 1));
      const maxGuests = Math.max(1, Math.round(Number(b.maxGuests) || 8));
      const basePrice = Math.max(100, Math.round(Number(b.basePrice) || 2800));
      const privateUpgrade = Math.max(0, Math.round(Number(b.privateUpgrade) || 750));
      const highlights = Array.isArray(b.highlights) ? b.highlights.map((x) => String(x || "").trim()).filter(Boolean) : [];
      const included = Array.isArray(b.included) ? b.included.map((x) => String(x || "").trim()).filter(Boolean) : [];
      const departures = Array.isArray(b.departures) ? b.departures.map((x) => String(x || "").trim()).filter(Boolean) : [];
      const itinerary = Array.isArray(b.itinerary) ? b.itinerary.map((step, idx) => ({
        day: String(step?.day || `Day ${String(idx + 1).padStart(2, "0")}`).trim(),
        title: String(step?.title || "").trim(),
        detail: String(step?.detail || "").trim(),
        ...step?.image ? { image: String(step.image).trim() } : {}
      })).filter((s) => s.title || s.detail) : [];
      if (itinerary.length === 0) {
        return res.status(400).json({
          error: "Please include at least one day in the itinerary."
        });
      }
      const created = await createCustomDestination({
        slug,
        title,
        location,
        country,
        region,
        days,
        nights,
        maxGuests,
        basePrice,
        privateUpgrade,
        season,
        rating,
        summary,
        image,
        highlights: highlights.length > 0 ? highlights : [`Curated private experiences in ${location}`],
        included: included.length > 0 ? included : [`${nights} nights luxury accommodation & private transfers`],
        departures: departures.length > 0 ? departures : ["Jun 15, 2027", "Sep 20, 2027", "Nov 10, 2027"],
        itinerary
      });
      return res.status(201).json({ package: created });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to create destination.";
      return res.status(500).json({ error: msg });
    }
  });
  app.delete("/api/owner/packages/:id", requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid destination ID." });
      }
      const deleted = await deleteCustomDestination(id);
      if (!deleted) {
        return res.status(404).json({ error: "Destination not found." });
      }
      return res.json({ deleted });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to delete destination.";
      return res.status(500).json({ error: msg });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error: "Travel concierge service is currently unavailable."
        });
      }
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const speedMode = req.body?.speedMode === "fast" ? "fast" : "balanced";
      if (rawMessages.length === 0) {
        return res.status(400).json({ error: "Message history cannot be empty." });
      }
      let isOwner = false;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const session = verifySessionToken(authHeader.slice("Bearer ".length).trim());
        if (session && session.role === "owner" && session.email === OWNER_EMAIL) {
          isOwner = true;
        }
      }
      let customSummary = "";
      try {
        const customRows = await getCustomDestinations();
        if (customRows.length > 0) {
          customSummary = "\nAdditional Owner-Curated Destinations:\n" + customRows.map(
            (p, i) => `${7 + i}. ${p.title} (${p.country}, ${p.region}) [/packages/${p.slug}] - ${p.days} Days / ${p.nights} Nights, Max ${p.maxGuests} guests, $${p.basePrice.toLocaleString()}/guest (+$${p.privateUpgrade.toLocaleString()} Private tier), Best ${p.season}. ${p.summary}`
          ).join("\n");
        }
      } catch {
      }
      const siteNavigationGuide = `Website Pages You Can Guide Users To:
- All Packages Storefront (/)
- Regional Filters: Europe (/destinations/europe), Asia (/destinations/asia), Nordics (/destinations/nordics)
- Package Detail & Instant Booking (/packages/santorini-caldera-escape, /packages/kyoto-autumn-sanctuary, /packages/swiss-alps-glacier-express, /packages/bali-ubud-cliffside-retreat, /packages/iceland-northern-lights-fjord, /packages/amalfi-coast-private-charter)
- Home Login, My Trips & Trip Cancellation (/home)
- Corporate & Group Proposal Form (/inquire)
- Owner Financial P&L & Destinations Studio (/owner, owner login required)`;
      let systemInstruction = `You are the Meridian Voyages Concierge, a refined and fast travel and site-navigation advisor for a luxury tourism business portal. Answer concisely (2-5 sentences or crisp '-' bullet points) using clean plain text without markdown asterisks (** or *). Use accurate details from our curated packages:
${PACKAGE_CATALOG_SUMMARY}${customSummary}

${siteNavigationGuide}

Help customers compare destinations, pick seasons, estimate trip totals (Signature vs Private tier), and navigate to the right page or package.`;
      if (isOwner) {
        try {
          const ownerData = await getOwnerDashboardData();
          const s = ownerData.summary;
          systemInstruction = `You are the Meridian Voyages Executive Business & Financial Advisor assisting owner Siddharth Hiremath (${OWNER_EMAIL}). Live PostgreSQL financial metrics right now: Gross Earnings $${s.grossEarnings.toLocaleString()}, Supplier Costs $${s.supplierCosts.toLocaleString()}, Operating Expenses $${s.operatingExpenses.toLocaleString()}, Refund & Cancellation Losses $${s.totalLosses.toLocaleString()}, Net Profit $${s.netProfit.toLocaleString()} (${s.profitMarginPct}% margin), Active Bookings ${s.activeBookings}/${s.totalBookings}, Open Corporate Inquiries ${s.openInquiries}. Top packages by profit: ${ownerData.packageBreakdown.slice(0, 3).map((p) => `${p.packageTitle} ($${p.profit.toLocaleString()} profit across ${p.guests} guests)`).join("; ")}. ${siteNavigationGuide}
Give crisp, actionable revenue, margin, and loss-reduction advice in clean plain text without markdown asterisks (**).`;
        } catch {
        }
      }
      const cleanedMessages = rawMessages.map((m) => ({
        role: m?.role === "model" ? "model" : "user",
        text: String(m?.text || "").trim()
      })).filter((m) => m.text.length > 0);
      const firstUserIndex = cleanedMessages.findIndex((m) => m.role === "user");
      const normalizedMessages = firstUserIndex >= 0 ? cleanedMessages.slice(firstUserIndex) : cleanedMessages;
      if (normalizedMessages.length === 0) {
        return res.status(400).json({ error: "Please enter a message." });
      }
      const priorTurns = normalizedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const latestText = normalizedMessages[normalizedMessages.length - 1].text;
      const askModel = async (targetModel) => {
        const chat = ai.chats.create({
          model: targetModel,
          history: priorTurns,
          config: {
            systemInstruction,
            ...targetModel === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}
          }
        });
        const responsePromise = chat.sendMessage({ message: latestText });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Model request timed out")), 5500)
        );
        const response = await Promise.race([responsePromise, timeoutPromise]);
        return response.text || "";
      };
      const primaryModel = speedMode === "fast" ? "gemini-3.1-flash-lite" : "gemini-4-hydrogen";
      let reply = "";
      let modelUsed = primaryModel;
      try {
        reply = await askModel(primaryModel);
      } catch (primaryError) {
        if (primaryModel !== "gemini-3.1-flash-lite") {
          console.warn("Primary concierge model fallback triggered:", primaryError);
          modelUsed = "gemini-3.1-flash-lite";
          reply = await askModel("gemini-3.1-flash-lite");
        } else {
          throw primaryError;
        }
      }
      if (!reply) {
        reply = "I could not generate a response right now. Please try rephrasing your question.";
      }
      return res.json({ reply, modelUsed });
    } catch (error) {
      console.error("Gemini chat error:", error);
      return res.status(503).json({
        error: "Unable to reach the travel concierge right now. Please try again."
      });
    }
  });
  app.all("/api/*", (_req, res) => {
    return res.status(404).json({ error: "Requested service endpoint not found." });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }
  const port = Number(process.env.PORT) || 3e3;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Meridian Voyages portal listening on http://0.0.0.0:${port}`);
  });
}
startServer();
