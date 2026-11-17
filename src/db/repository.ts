import { and, desc, eq } from 'drizzle-orm';
import { db, ensureSchemaReady, isDatabaseConfigured } from './index';
import {
  bookings,
  DestinationItineraryDay,
  destinations,
  expenses,
  inquiries,
  users,
} from './schema';

export async function upsertUser(
  uid: string,
  email: string,
  name: string,
  role: 'customer' | 'owner'
) {
  try {
    await ensureSchemaReady();
    const result = await db
      .insert(users)
      .values({ uid, email, name, role })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email, name, role },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database upsertUser failed:', error);
    throw new Error('Unable to save user profile.', { cause: error });
  }
}

export async function createBookingRecord(input: {
  reference: string;
  packageSlug: string;
  packageTitle: string;
  destination: string;
  customerName: string;
  customerEmail: string;
  departureDate: string;
  guests: number;
  tier: string;
  revenue: number;
  cost: number;
  notes?: string;
}) {
  try {
    await ensureSchemaReady();
    const result = await db
      .insert(bookings)
      .values({
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
        status: 'confirmed',
        notes: input.notes || '',
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database createBookingRecord failed:', error);
    throw new Error('Unable to create booking.', { cause: error });
  }
}

export async function getBookingsByCustomerEmail(email: string) {
  try {
    await ensureSchemaReady();
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.customerEmail, email.toLowerCase()))
      .orderBy(desc(bookings.id));
  } catch (error) {
    console.error('Database getBookingsByCustomerEmail failed:', error);
    throw new Error('Unable to load customer bookings.', { cause: error });
  }
}

export async function cancelCustomerBookingRecord(
  id: number,
  customerEmail: string
) {
  try {
    await ensureSchemaReady();
    const existing = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.customerEmail, customerEmail.toLowerCase())
        )
      );

    if (existing.length === 0) {
      return { notFound: true as const };
    }
    if (
      existing[0].status === 'cancelled' ||
      existing[0].status === 'refunded'
    ) {
      return { alreadyCancelled: true as const, booking: existing[0] };
    }

    const updated = await db
      .update(bookings)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(bookings.id, id),
          eq(bookings.customerEmail, customerEmail.toLowerCase())
        )
      )
      .returning();

    return { booking: updated[0] };
  } catch (error) {
    console.error('Database cancelCustomerBookingRecord failed:', error);
    throw new Error('Unable to cancel booking.', { cause: error });
  }
}

export async function createInquiryRecord(input: {
  reference: string;
  companyOrName: string;
  email: string;
  destination: string;
  groupSize: number;
  details: string;
}) {
  try {
    await ensureSchemaReady();
    const result = await db
      .insert(inquiries)
      .values({
        reference: input.reference,
        companyOrName: input.companyOrName,
        email: input.email.toLowerCase(),
        destination: input.destination,
        groupSize: input.groupSize,
        details: input.details,
        status: 'open',
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database createInquiryRecord failed:', error);
    throw new Error('Unable to submit inquiry.', { cause: error });
  }
}

export async function getCustomDestinations() {
  if (!isDatabaseConfigured()) {
    return [];
  }
  try {
    await ensureSchemaReady();
    const rows = await db
      .select()
      .from(destinations)
      .orderBy(desc(destinations.id));
    return rows.map((row) => ({
      ...row,
      isCustom: true as const,
    }));
  } catch (error) {
    console.error('Database getCustomDestinations failed:', error);
    throw new Error('Unable to load custom destinations.', { cause: error });
  }
}

export async function createCustomDestination(input: {
  slug: string;
  title: string;
  location: string;
  country: string;
  region: string;
  days: number;
  nights: number;
  maxGuests: number;
  basePrice: number;
  privateUpgrade: number;
  season: string;
  rating: string;
  summary: string;
  image: string;
  highlights: string[];
  included: string[];
  departures: string[];
  itinerary: DestinationItineraryDay[];
}) {
  try {
    await ensureSchemaReady();
    const existing = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, input.slug));

    const finalSlug =
      existing.length > 0
        ? `${input.slug}-${Math.floor(100 + Math.random() * 900)}`
        : input.slug;

    const result = await db
      .insert(destinations)
      .values({
        ...input,
        slug: finalSlug,
      })
      .returning();

    return {
      ...result[0],
      isCustom: true as const,
    };
  } catch (error) {
    console.error('Database createCustomDestination failed:', error);
    throw new Error('Unable to save new destination.', { cause: error });
  }
}

export async function deleteCustomDestination(id: number) {
  try {
    await ensureSchemaReady();
    const deleted = await db
      .delete(destinations)
      .where(eq(destinations.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database deleteCustomDestination failed:', error);
    throw new Error('Unable to delete destination.', { cause: error });
  }
}

export async function getOwnerDashboardData() {
  try {
    await ensureSchemaReady();
    const [allBookings, allExpenses, allInquiries, allUsers, customDestinations] =
      await Promise.all([
        db.select().from(bookings).orderBy(desc(bookings.id)),
        db.select().from(expenses).orderBy(desc(expenses.id)),
        db.select().from(inquiries).orderBy(desc(inquiries.id)),
        db.select().from(users),
        db.select().from(destinations).orderBy(desc(destinations.id)),
      ]);

    let grossEarnings = 0;
    let confirmedRevenue = 0;
    let pendingRevenue = 0;
    let supplierCosts = 0;
    let bookingLosses = 0;
    let totalGuests = 0;

    const packageMap = new Map<
      string,
      {
        packageSlug: string;
        packageTitle: string;
        destination: string;
        bookingsCount: number;
        guests: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    for (const b of allBookings) {
      if (b.status === 'refunded' || b.status === 'cancelled') {
        // Non-recoverable partner loss or net loss on cancelled/refunded trip
        const lossAmt = Math.max(450, Math.round(b.cost * 0.28));
        bookingLosses += lossAmt;
      } else {
        grossEarnings += b.revenue;
        supplierCosts += b.cost;
        totalGuests += b.guests;
        if (b.status === 'confirmed') confirmedRevenue += b.revenue;
        if (b.status === 'pending') pendingRevenue += b.revenue;
      }

      const existing = packageMap.get(b.packageSlug) || {
        packageSlug: b.packageSlug,
        packageTitle: b.packageTitle,
        destination: b.destination,
        bookingsCount: 0,
        guests: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      if (b.status !== 'refunded' && b.status !== 'cancelled') {
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
      if (e.entryType === 'loss') {
        recordedLosses += e.amount;
      } else {
        operatingExpenses += e.amount;
      }
    }

    const totalLosses = recordedLosses + bookingLosses;
    const totalOutflow = supplierCosts + operatingExpenses + totalLosses;
    const netProfit = grossEarnings - totalOutflow;
    const profitMarginPct =
      grossEarnings > 0 ? Number(((netProfit / grossEarnings) * 100).toFixed(1)) : 0;

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
          (b) => b.status === 'confirmed' || b.status === 'pending'
        ).length,
        totalGuests,
        openInquiries: allInquiries.filter((i) => i.status === 'open').length,
        registeredCustomers: allUsers.filter((u) => u.role === 'customer').length,
      },
      packageBreakdown: Array.from(packageMap.values()).sort(
        (a, b) => b.profit - a.profit
      ),
      bookings: allBookings,
      expenses: allExpenses,
      inquiries: allInquiries,
      customDestinations: customDestinations.map((d) => ({
        ...d,
        isCustom: true as const,
      })),
    };
  } catch (error) {
    console.error('Database getOwnerDashboardData failed:', error);
    throw new Error('Unable to load owner financial dashboard.', {
      cause: error,
    });
  }
}

export async function updateBookingStatusRecord(id: number, status: string) {
  try {
    await ensureSchemaReady();
    const result = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database updateBookingStatusRecord failed:', error);
    throw new Error('Unable to update booking status.', { cause: error });
  }
}

export async function addExpenseRecord(input: {
  title: string;
  category: string;
  amount: number;
  entryType: 'expense' | 'loss';
  packageSlug: string;
  recordedDate: string;
}) {
  try {
    await ensureSchemaReady();
    const result = await db
      .insert(expenses)
      .values(input)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database addExpenseRecord failed:', error);
    throw new Error('Unable to record financial entry.', { cause: error });
  }
}

export async function updateInquiryStatusRecord(id: number, status: string) {
  try {
    await ensureSchemaReady();
    const result = await db
      .update(inquiries)
      .set({ status })
      .where(eq(inquiries.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database updateInquiryStatusRecord failed:', error);
    throw new Error('Unable to update inquiry status.', { cause: error });
  }
}
