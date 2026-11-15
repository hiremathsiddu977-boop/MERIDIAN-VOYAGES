import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  AuthRequest,
  OWNER_EMAIL,
  requireAuth,
  requireOwner,
  signSessionToken,
  verifySessionToken,
} from './src/middleware/auth.ts';
import {
  addExpenseRecord,
  cancelCustomerBookingRecord,
  createBookingRecord,
  createCustomDestination,
  createInquiryRecord,
  deleteCustomDestination,
  getBookingsByCustomerEmail,
  getCustomDestinations,
  getOwnerDashboardData,
  updateBookingStatusRecord,
  updateInquiryStatusRecord,
  upsertUser,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PACKAGE_CATALOG_SUMMARY = `
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
  app.use(express.json({ limit: '10mb' }));

  // Auth: Customer email login (supports any customer email)
  app.post('/api/auth/customer', async (req, res) => {
    try {
      const rawEmail = String(req.body?.email || '').trim().toLowerCase();
      const rawName = String(req.body?.name || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (rawEmail === OWNER_EMAIL) {
        return res.status(403).json({
          error: 'This email is reserved for the Owner Console. Switch to Owner Login and enter your owner password.',
        });
      }

      const displayName =
        rawName ||
        rawEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const uid = `customer:${rawEmail}`;
      await upsertUser(uid, rawEmail, displayName, 'customer');

      const user = { uid, email: rawEmail, name: displayName, role: 'customer' as const };
      const token = signSessionToken(user);
      return res.json({ token, user });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Customer sign-in failed.';
      return res.status(500).json({ error: msg });
    }
  });

  // Auth: Owner login — restricted exclusively to hiremathsiddu@gmail.com / 1518
  app.post('/api/auth/owner', async (req, res) => {
    try {
      const rawEmail = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '').trim();

      if (rawEmail !== OWNER_EMAIL || password !== '1518') {
        return res.status(401).json({
          error: 'Invalid owner credentials. Only the authorized owner account and passcode are accepted.',
        });
      }

      const uid = `owner:${OWNER_EMAIL}`;
      const name = 'Siddharth Hiremath';
      await upsertUser(uid, OWNER_EMAIL, name, 'owner');

      const user = { uid, email: OWNER_EMAIL, name, role: 'owner' as const };
      const token = signSessionToken(user);
      return res.json({ token, user });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Owner sign-in failed.';
      return res.status(500).json({ error: msg });
    }
  });

  // Auth: Sync Google Sign-In Firebase user into PostgreSQL
  app.post('/api/auth/google', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.sessionUser!;
      await upsertUser(user.uid, user.email, user.name, user.role);
      return res.json({ user });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to sync user.';
      return res.status(500).json({ error: msg });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    return res.json({ user: req.sessionUser });
  });

  // Public: Load custom destination packages created by Owner
  app.get('/api/packages', async (_req, res) => {
    try {
      const packages = await getCustomDestinations();
      return res.json({ packages });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to load destinations.';
      return res.status(500).json({ error: msg });
    }
  });

  // Consumer: Create booking persisted to Cloud SQL PostgreSQL
  app.post('/api/bookings', async (req, res) => {
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
        notes,
      } = req.body || {};

      if (!packageSlug || !customerName || !customerEmail || !departureDate) {
        return res.status(400).json({ error: 'Missing required booking fields.' });
      }

      const guestCount = Math.max(1, Number(guests) || 1);
      const perGuest = Math.max(100, Number(unitPrice) || 2500);
      const revenue = perGuest * guestCount;
      // Partner hotel, transfer, and excursion wholesale cost (~62% of gross booking)
      const cost = Math.round(revenue * 0.62);
      const reference = `MV-${Math.floor(1000 + Math.random() * 9000)}`;

      const created = await createBookingRecord({
        reference,
        packageSlug: String(packageSlug),
        packageTitle: String(packageTitle || packageSlug),
        destination: String(destination || 'Global'),
        customerName: String(customerName).trim(),
        customerEmail: String(customerEmail).trim().toLowerCase(),
        departureDate: String(departureDate),
        guests: guestCount,
        tier: tier === 'private' ? 'private' : 'signature',
        revenue,
        cost,
        notes: String(notes || '').trim(),
      });

      return res.status(201).json({ booking: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save booking.';
      return res.status(500).json({ error: msg });
    }
  });

  // Customer: View own bookings
  app.get('/api/my-bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await getBookingsByCustomerEmail(req.sessionUser!.email);
      return res.json({ bookings: rows });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load trips.';
      return res.status(500).json({ error: msg });
    }
  });

  // Customer: Cancel own booking
  app.post('/api/my-bookings/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid booking ID.' });
      }
      const outcome = await cancelCustomerBookingRecord(
        id,
        req.sessionUser!.email
      );
      if ('notFound' in outcome) {
        return res.status(404).json({ error: 'Booking not found for this account.' });
      }
      if ('alreadyCancelled' in outcome) {
        return res.status(400).json({ error: 'This trip is already cancelled.' });
      }
      return res.json({ booking: outcome.booking });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to cancel trip.';
      return res.status(500).json({ error: msg });
    }
  });

  // Consumer: Submit corporate/group inquiry
  app.post('/api/inquiries', async (req, res) => {
    try {
      const { companyOrName, email, destination, groupSize, details } = req.body || {};
      if (!companyOrName || !email || !destination) {
        return res.status(400).json({ error: 'Please complete all required fields.' });
      }
      const reference = `INQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const created = await createInquiryRecord({
        reference,
        companyOrName: String(companyOrName).trim(),
        email: String(email).trim().toLowerCase(),
        destination: String(destination).trim(),
        groupSize: Math.max(1, Number(groupSize) || 1),
        details: String(details || '').trim(),
      });
      return res.status(201).json({ inquiry: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to submit inquiry.';
      return res.status(500).json({ error: msg });
    }
  });

  // Owner Portal: Financial P&L, Bookings Ledger, Expenses/Losses, Inquiries
  app.get('/api/owner/dashboard', requireOwner, async (_req, res) => {
    try {
      const data = await getOwnerDashboardData();
      return res.json(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Dashboard unavailable.';
      return res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/owner/bookings/:id', requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').trim();
      if (!id || !['confirmed', 'pending', 'refunded', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid booking update.' });
      }
      const updated = await updateBookingStatusRecord(id, status);
      return res.json({ booking: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Update failed.';
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/owner/expenses', requireOwner, async (req, res) => {
    try {
      const { title, category, amount, entryType, packageSlug, recordedDate } =
        req.body || {};
      const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
      if (!title || !category || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Title, category, and positive amount are required.' });
      }
      const created = await addExpenseRecord({
        title: String(title).trim(),
        category: String(category).trim(),
        amount: parsedAmount,
        entryType: entryType === 'loss' ? 'loss' : 'expense',
        packageSlug: String(packageSlug || 'general'),
        recordedDate: String(recordedDate || new Date().toISOString().slice(0, 10)),
      });
      return res.status(201).json({ expense: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to log entry.';
      return res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/owner/inquiries/:id', requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').trim();
      if (!id || !['open', 'quoted', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid inquiry status.' });
      }
      const updated = await updateInquiryStatusRecord(id, status);
      return res.json({ inquiry: updated });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Update failed.';
      return res.status(500).json({ error: msg });
    }
  });

  // Owner Portal: Publish a new destination package
  app.post('/api/owner/packages', requireOwner, async (req, res) => {
    try {
      const b = req.body || {};
      const title = String(b.title || '').trim();
      const location = String(b.location || '').trim();
      const country = String(b.country || '').trim();
      const region = String(b.region || 'Europe').trim();
      const summary = String(b.summary || '').trim();
      const image = String(b.image || '').trim();
      const season = String(b.season || 'Year-Round').trim();
      const rating = String(b.rating || '5.0').trim();

      if (!title || !location || !country || !summary || !image) {
        return res.status(400).json({
          error: 'Title, location, country, summary, and a destination photo are required.',
        });
      }

      const rawSlug = String(b.slug || title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const slug = rawSlug || `destination-${Date.now()}`;

      const days = Math.max(1, Math.round(Number(b.days) || 5));
      const nights = Math.max(0, Math.round(Number(b.nights) ?? days - 1));
      const maxGuests = Math.max(1, Math.round(Number(b.maxGuests) || 8));
      const basePrice = Math.max(100, Math.round(Number(b.basePrice) || 2800));
      const privateUpgrade = Math.max(0, Math.round(Number(b.privateUpgrade) || 750));

      const highlights = Array.isArray(b.highlights)
        ? b.highlights.map((x: unknown) => String(x || '').trim()).filter(Boolean)
        : [];
      const included = Array.isArray(b.included)
        ? b.included.map((x: unknown) => String(x || '').trim()).filter(Boolean)
        : [];
      const departures = Array.isArray(b.departures)
        ? b.departures.map((x: unknown) => String(x || '').trim()).filter(Boolean)
        : [];
      const itinerary = Array.isArray(b.itinerary)
        ? b.itinerary
            .map((step: { day?: unknown; title?: unknown; detail?: unknown; image?: unknown }, idx: number) => ({
              day: String(step?.day || `Day ${String(idx + 1).padStart(2, '0')}`).trim(),
              title: String(step?.title || '').trim(),
              detail: String(step?.detail || '').trim(),
              ...(step?.image ? { image: String(step.image).trim() } : {}),
            }))
            .filter((s: { title: string; detail: string }) => s.title || s.detail)
        : [];

      if (itinerary.length === 0) {
        return res.status(400).json({
          error: 'Please include at least one day in the itinerary.',
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
        departures: departures.length > 0 ? departures : ['Jun 15, 2027', 'Sep 20, 2027', 'Nov 10, 2027'],
        itinerary,
      });

      return res.status(201).json({ package: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to create destination.';
      return res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/owner/packages/:id', requireOwner, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid destination ID.' });
      }
      const deleted = await deleteCustomDestination(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Destination not found.' });
      }
      return res.json({ deleted });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to delete destination.';
      return res.status(500).json({ error: msg });
    }
  });

  // Multi-turn Gemini Travel Concierge & Owner Business Advisor
  app.post('/api/chat', async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'Travel concierge service is currently unavailable.',
        });
      }

      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const speedMode = req.body?.speedMode === 'fast' ? 'fast' : 'balanced';
      if (rawMessages.length === 0) {
        return res.status(400).json({ error: 'Message history cannot be empty.' });
      }

      // Check if caller is authenticated as Owner to provide live P&L business context
      let isOwner = false;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const session = verifySessionToken(authHeader.slice('Bearer '.length).trim());
        if (session && session.role === 'owner' && session.email === OWNER_EMAIL) {
          isOwner = true;
        }
      }

      let customSummary = '';
      try {
        const customRows = await getCustomDestinations();
        if (customRows.length > 0) {
          customSummary =
            '\nAdditional Owner-Curated Destinations:\n' +
            customRows
              .map(
                (p, i) =>
                  `${7 + i}. ${p.title} (${p.country}, ${p.region}) - ${p.days} Days / ${p.nights} Nights, Max ${p.maxGuests} guests, $${p.basePrice.toLocaleString()}/guest (+$${p.privateUpgrade.toLocaleString()} Private tier), Best ${p.season}. ${p.summary}`
              )
              .join('\n');
        }
      } catch {
        // Ignore if custom packages fetch fails
      }

      let systemInstruction =
        `You are the Meridian Voyages Concierge, a refined and fast travel advisor for a luxury tourism business portal. ` +
        `Answer concisely (2-5 sentences or crisp '-' bullet points) using clean plain text without markdown asterisks (** or *). ` +
        `Use accurate details from our curated packages:\n` +
        `${PACKAGE_CATALOG_SUMMARY}${customSummary}\n` +
        `Help customers compare destinations, pick seasons, estimate trip totals (Signature vs Private tier), and suggest itineraries.`;

      if (isOwner) {
        try {
          const ownerData = await getOwnerDashboardData();
          const s = ownerData.summary;
          systemInstruction =
            `You are the Meridian Voyages Executive Business & Financial Advisor assisting owner Siddharth Hiremath (${OWNER_EMAIL}). ` +
            `Live PostgreSQL financial metrics right now: ` +
            `Gross Earnings $${s.grossEarnings.toLocaleString()}, Supplier Costs $${s.supplierCosts.toLocaleString()}, ` +
            `Operating Expenses $${s.operatingExpenses.toLocaleString()}, Refund & Cancellation Losses $${s.totalLosses.toLocaleString()}, ` +
            `Net Profit $${s.netProfit.toLocaleString()} (${s.profitMarginPct}% margin), ` +
            `Active Bookings ${s.activeBookings}/${s.totalBookings}, Open Corporate Inquiries ${s.openInquiries}. ` +
            `Top packages by profit: ${ownerData.packageBreakdown
              .slice(0, 3)
              .map((p) => `${p.packageTitle} ($${p.profit.toLocaleString()} profit across ${p.guests} guests)`)
              .join('; ')}. ` +
            `Give crisp, actionable revenue, margin, and loss-reduction advice in clean plain text without markdown asterisks (**).`;
        } catch {
          // Proceed cleanly with base catalog if owner snapshot fails
        }
      }

      const cleanedMessages = rawMessages
        .map((m: { role?: unknown; text?: unknown }) => ({
          role: m?.role === 'model' ? ('model' as const) : ('user' as const),
          text: String(m?.text || '').trim(),
        }))
        .filter((m: { text: string }) => m.text.length > 0);

      // Ensure conversation history starts with a user turn
      const firstUserIndex = cleanedMessages.findIndex((m: { role: string }) => m.role === 'user');
      const normalizedMessages =
        firstUserIndex >= 0 ? cleanedMessages.slice(firstUserIndex) : cleanedMessages;

      if (normalizedMessages.length === 0) {
        return res.status(400).json({ error: 'Please enter a message.' });
      }

      const priorTurns = normalizedMessages.slice(0, -1).map((m: { role: 'user' | 'model'; text: string }) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const latestText = normalizedMessages[normalizedMessages.length - 1].text;

      const askModel = async (targetModel: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen') => {
        const chat = ai.chats.create({
          model: targetModel,
          history: priorTurns,
          config: {
            systemInstruction,
            ...(targetModel === 'gemini-4-hydrogen'
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });
        const response = await chat.sendMessage({ message: latestText });
        return response.text || '';
      };

      const primaryModel =
        speedMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

      let reply = '';
      let modelUsed = primaryModel;
      try {
        reply = await askModel(primaryModel);
      } catch (primaryError) {
        if (primaryModel !== 'gemini-3.1-flash-lite') {
          console.warn('Primary concierge model fallback triggered:', primaryError);
          modelUsed = 'gemini-3.1-flash-lite';
          reply = await askModel('gemini-3.1-flash-lite');
        } else {
          throw primaryError;
        }
      }

      if (!reply) {
        reply = 'I could not generate a response right now. Please try rephrasing your question.';
      }
      return res.json({ reply, modelUsed });
    } catch (error: unknown) {
      console.error('Gemini chat error:', error);
      return res.status(500).json({
        error: 'Unable to reach the travel concierge right now. Please try again.',
      });
    }
  });

  // Serve Vite in dev or built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Meridian Voyages portal listening on http://0.0.0.0:${port}`);
  });
}

startServer();
