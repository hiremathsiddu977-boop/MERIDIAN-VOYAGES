import {
  bigint,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface DestinationItineraryDay {
  day: string;
  title: string;
  detail: string;
  image?: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  packageSlug: text('package_slug').notNull(),
  packageTitle: text('package_title').notNull(),
  destination: text('destination').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  departureDate: text('departure_date').notNull(),
  guests: bigint('guests', { mode: 'number' }).notNull(),
  tier: text('tier').notNull(),
  revenue: bigint('revenue', { mode: 'number' }).notNull(),
  cost: bigint('cost', { mode: 'number' }).notNull(),
  status: text('status').notNull().default('confirmed'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  entryType: text('entry_type').notNull().default('expense'),
  packageSlug: text('package_slug').notNull().default('general'),
  recordedDate: text('recorded_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  companyOrName: text('company_or_name').notNull(),
  email: text('email').notNull(),
  destination: text('destination').notNull(),
  groupSize: bigint('group_size', { mode: 'number' }).notNull(),
  details: text('details').notNull().default(''),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const destinations = pgTable('destinations', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  country: text('country').notNull(),
  region: text('region').notNull(),
  days: integer('days').notNull(),
  nights: integer('nights').notNull(),
  maxGuests: integer('max_guests').notNull(),
  basePrice: integer('base_price').notNull(),
  privateUpgrade: integer('private_upgrade').notNull(),
  season: text('season').notNull(),
  rating: text('rating').notNull().default('5.0'),
  summary: text('summary').notNull(),
  image: text('image').notNull(),
  highlights: jsonb('highlights').$type<string[]>().notNull(),
  included: jsonb('included').$type<string[]>().notNull(),
  departures: jsonb('departures').$type<string[]>().notNull(),
  itinerary: jsonb('itinerary').$type<DestinationItineraryDay[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
