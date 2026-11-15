import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ImagePlus,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  AVAILABLE_REGIONS,
  ItineraryDay,
  Region,
  TravelPackage,
} from '../data/packages';

export interface OwnerDashboardPayload {
  summary: {
    grossEarnings: number;
    confirmedRevenue: number;
    pendingRevenue: number;
    supplierCosts: number;
    operatingExpenses: number;
    totalLosses: number;
    netProfit: number;
    profitMarginPct: number;
    totalBookings: number;
    activeBookings: number;
    totalGuests: number;
    openInquiries: number;
    registeredCustomers: number;
  };
  packageBreakdown: Array<{
    packageSlug: string;
    packageTitle: string;
    destination: string;
    bookingsCount: number;
    guests: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  bookings: Array<{
    id: number;
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
    status: string;
    notes: string;
  }>;
  expenses: Array<{
    id: number;
    title: string;
    category: string;
    amount: number;
    entryType: string;
    packageSlug: string;
    recordedDate: string;
  }>;
  inquiries: Array<{
    id: number;
    reference: string;
    companyOrName: string;
    email: string;
    destination: string;
    groupSize: number;
    details: string;
    status: string;
  }>;
  customDestinations?: TravelPackage[];
}

async function compressImageFile(file: File, maxWidth = 1100): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DEFAULT_ITINERARY_DAYS: ItineraryDay[] = [
  {
    day: 'Day 01',
    title: 'Arrival & Welcome Sanctuary',
    detail: 'Private airport chauffeur transfer to your cliffside or lodge suite, followed by sunset welcome aperitifs.',
    image: '',
  },
  {
    day: 'Day 02',
    title: 'Signature Guided Excursion',
    detail: 'Morning private excursion to the destination’s iconic landmark with reserved local lunch.',
    image: '',
  },
  {
    day: 'Day 03',
    title: 'Scenic Trail & Departure',
    detail: 'Leisurely morning view walk and private chauffeur return transfer.',
    image: '',
  },
];

export function OwnerDashboard({
  token,
  ownerEmail,
  onOpenStorefront,
  onOpenPackage,
  onDestinationsChanged,
  onSignOut,
}: {
  token: string;
  ownerEmail: string;
  onOpenStorefront: () => void;
  onOpenPackage: (slug: string) => void;
  onDestinationsChanged: () => void;
  onSignOut: () => void;
}) {
  const [data, setData] = useState<OwnerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'destinations'>('ledger');
  const [bookingFilter, setBookingFilter] = useState<string>('all');

  // New Expense / Loss form state
  const [entryTitle, setEntryTitle] = useState('');
  const [entryCategory, setEntryCategory] = useState('Villa Partner');
  const [entryType, setEntryType] = useState<'expense' | 'loss'>('expense');
  const [entryAmount, setEntryAmount] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Add New Destination state
  const [destTitle, setDestTitle] = useState('');
  const [destSlug, setDestSlug] = useState('');
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [destLocation, setDestLocation] = useState('');
  const [destCountry, setDestCountry] = useState('');
  const [destRegion, setDestRegion] = useState<Region>('Americas');
  const [destDays, setDestDays] = useState('5');
  const [destNights, setDestNights] = useState('4');
  const [destMaxGuests, setDestMaxGuests] = useState('8');
  const [destSeason, setDestSeason] = useState('May – October');
  const [destRating, setDestRating] = useState('5.0');
  const [destBasePrice, setDestBasePrice] = useState('3150');
  const [destPrivateUpgrade, setDestPrivateUpgrade] = useState('820');
  const [destImage, setDestImage] = useState('');
  const [destSummary, setDestSummary] = useState('');
  const [destHighlights, setDestHighlights] = useState(
    'Private boutique lodge or sanctuary suite\nDedicated local guide and chauffeur transfers\nCurated evening tasting dinner'
  );
  const [destIncluded, setDestIncluded] = useState(
    'All nights in vetted luxury accommodation\nDaily breakfast and signature excursions\n24/7 local host & private airport transfers'
  );
  const [destDepartures, setDestDepartures] = useState(
    'Jun 14, 2027, Aug 20, 2027, Oct 12, 2027'
  );
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>(
    DEFAULT_ITINERARY_DAYS
  );
  const [destError, setDestError] = useState('');
  const [destSuccessSlug, setDestSuccessSlug] = useState<string | null>(null);
  const [submittingDest, setSubmittingDest] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/owner/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load owner console.');
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleBookingStatusChange = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/owner/bookings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadDashboard();
      }
    } catch {
      // Keep UI responsive
    }
  };

  const handleInquiryStatusChange = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/owner/inquiries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadDashboard();
      }
    } catch {
      // Keep UI responsive
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.round(Number(entryAmount));
    if (!entryTitle.trim() || !numericAmount || numericAmount <= 0) return;

    setSubmittingEntry(true);
    try {
      const res = await fetch('/api/owner/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: entryTitle.trim(),
          category: entryCategory,
          entryType,
          amount: numericAmount,
          packageSlug: 'general',
          recordedDate: new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) {
        setEntryTitle('');
        setEntryAmount('');
        await loadDashboard();
      }
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setDestImage(dataUrl);
      setDestError('');
    } catch (err: unknown) {
      setDestError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleDayPhotoUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 960);
      setItineraryDays((prev) =>
        prev.map((step, i) => (i === index ? { ...step, image: dataUrl } : step))
      );
      setDestError('');
    } catch (err: unknown) {
      setDestError(err instanceof Error ? err.message : 'Unable to process day photo.');
    }
  };

  const handleAddItineraryDay = () => {
    setItineraryDays((prev) => [
      ...prev,
      {
        day: `Day ${String(prev.length + 1).padStart(2, '0')}`,
        title: '',
        detail: '',
        image: '',
      },
    ]);
  };

  const handleRemoveItineraryDay = (index: number) => {
    setItineraryDays((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setDestError('');
    setDestSuccessSlug(null);

    if (!destTitle.trim() || !destLocation.trim() || !destCountry.trim()) {
      setDestError('Please provide Destination Title, Location, and Country.');
      return;
    }
    if (!destSummary.trim()) {
      setDestError('Please add a brief summary describing this destination.');
      return;
    }
    if (!destImage.trim()) {
      setDestError('Please upload a cover photo or paste an image URL for this destination.');
      return;
    }

    const cleanedDays = itineraryDays
      .map((step, idx) => ({
        day: step.day.trim() || `Day ${String(idx + 1).padStart(2, '0')}`,
        title: step.title.trim(),
        detail: step.detail.trim(),
        ...(step.image?.trim() ? { image: step.image.trim() } : {}),
      }))
      .filter((s) => s.title || s.detail);

    if (cleanedDays.length === 0) {
      setDestError('Please include at least one day in the itinerary.');
      return;
    }

    setSubmittingDest(true);
    try {
      const res = await fetch('/api/owner/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: destTitle.trim(),
          slug: destSlug.trim() || slugifyTitle(destTitle),
          location: destLocation.trim(),
          country: destCountry.trim(),
          region: destRegion,
          days: Math.max(1, Number(destDays) || cleanedDays.length),
          nights: Math.max(0, Number(destNights) || Math.max(0, cleanedDays.length - 1)),
          maxGuests: Math.max(1, Number(destMaxGuests) || 8),
          season: destSeason.trim() || 'Year-Round',
          rating: destRating.trim() || '5.0',
          basePrice: Math.max(100, Number(destBasePrice) || 2800),
          privateUpgrade: Math.max(0, Number(destPrivateUpgrade) || 750),
          image: destImage.trim(),
          summary: destSummary.trim(),
          highlights: destHighlights
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          included: destIncluded
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          departures: destDepartures
            .split(/[,\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          itinerary: cleanedDays,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to publish destination.');
      }

      setDestSuccessSlug(json.package.slug);
      setDestTitle('');
      setDestSlug('');
      setSlugEditedManually(false);
      setDestLocation('');
      setDestCountry('');
      setDestImage('');
      setDestSummary('');
      setItineraryDays(DEFAULT_ITINERARY_DAYS);

      await loadDashboard();
      onDestinationsChanged();
    } catch (err: unknown) {
      setDestError(err instanceof Error ? err.message : 'Unable to save destination.');
    } finally {
      setSubmittingDest(false);
    }
  };

  const handleDeleteDestination = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/owner/packages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        await loadDashboard();
        onDestinationsChanged();
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-panel rounded-3xl p-8 space-y-6">
        <div className="h-8 w-64 rounded-lg bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/10 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel mx-auto max-w-xl rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-white">
          Unable to load Owner Console
        </h1>
        <p className="mt-2 text-sm text-amber-200">{error || 'No data returned.'}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-950"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-white/25 px-4 py-2 text-xs font-semibold text-white"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const {
    summary,
    packageBreakdown,
    bookings,
    expenses,
    inquiries,
    customDestinations = [],
  } = data;
  const visibleBookings =
    bookingFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === bookingFilter);

  const isProfitable = summary.netProfit >= 0;

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <section className="glass-panel rounded-3xl p-7 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium text-amber-200">
              Owner Business Console · {ownerEmail}
            </p>
            <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight text-white">
              Earnings, Profit &amp; Destination Studio
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-slate-950/50 px-3.5 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Refresh Ledger
            </button>
            <button
              type="button"
              onClick={onOpenStorefront}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-slate-950/50 px-3.5 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Consumer Storefront
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Workspace View Switcher */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/12 pt-5">
          <div
            role="tablist"
            aria-label="Owner console sections"
            className="inline-flex rounded-xl border border-white/15 bg-slate-950/55 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ledger'}
              onClick={() => setActiveTab('ledger')}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Financials &amp; Bookings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'destinations'}
              onClick={() => setActiveTab('destinations')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'destinations'
                  ? 'bg-white text-slate-950'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Add &amp; Manage Destinations ({6 + customDestinations.length})
            </button>
          </div>

          {activeTab === 'ledger' && (
            <button
              type="button"
              onClick={() => setActiveTab('destinations')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-300/15 px-3.5 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/25 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add New Destination
            </button>
          )}
        </div>

        {/* 4 Primary P&L KPIs */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-slate-950/45 p-5">
            <div className="text-xs font-medium text-slate-300">
              Gross Earnings
            </div>
            <div className="mt-2 text-3xl font-semibold text-white tabular-nums">
              ${summary.grossEarnings.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-300 tabular-nums">
              ${summary.confirmedRevenue.toLocaleString()} confirmed · $
              {summary.pendingRevenue.toLocaleString()} pending
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-950/45 p-5">
            <div className="text-xs font-medium text-slate-300">Net Profit</div>
            <div
              className={`mt-2 text-3xl font-semibold tabular-nums ${
                isProfitable ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfitable ? '' : '-'}$
              {Math.abs(summary.netProfit).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-300 tabular-nums">
              {summary.profitMarginPct}% net margin after all costs
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-950/45 p-5">
            <div className="text-xs font-medium text-slate-300">
              Partner &amp; Operating Costs
            </div>
            <div className="mt-2 text-3xl font-semibold text-white tabular-nums">
              ${(summary.supplierCosts + summary.operatingExpenses).toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-300 tabular-nums">
              ${summary.supplierCosts.toLocaleString()} suppliers · $
              {summary.operatingExpenses.toLocaleString()} ops
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-950/45 p-5">
            <div className="text-xs font-medium text-slate-300">
              Refunds &amp; Losses
            </div>
            <div className="mt-2 text-3xl font-semibold text-rose-400 tabular-nums">
              ${summary.totalLosses.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-300 tabular-nums">
              {summary.activeBookings} active · {summary.openInquiries} open inquiries
            </div>
          </div>
        </div>
      </section>

      {activeTab === 'destinations' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Add New Destination Form */}
          <section className="glass-panel rounded-3xl p-7 lg:col-span-8">
            <h2 className="font-display text-3xl font-semibold text-white">
              Add New Destination Package
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Publish a complete itinerary with main photography and day-by-day location photos directly to the customer portal.
            </p>

            {destSuccessSlug && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/45 p-4 text-xs">
                <span className="font-medium text-emerald-200">
                  Destination published live at /packages/{destSuccessSlug}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPackage(destSuccessSlug)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-950 transition-colors hover:bg-amber-100"
                >
                  View Destination Page
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            <form onSubmit={handlePublishDestination} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dest-title"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Package Title
                  </label>
                  <input
                    id="dest-title"
                    type="text"
                    required
                    value={destTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDestTitle(val);
                      if (!slugEditedManually) {
                        setDestSlug(slugifyTitle(val));
                      }
                    }}
                    placeholder="e.g., Patagonia Glaciers & Fjords"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-slug"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Human URL Slug (/packages/...)
                  </label>
                  <input
                    id="dest-slug"
                    type="text"
                    value={destSlug}
                    onChange={(e) => {
                      setSlugEditedManually(true);
                      setDestSlug(slugifyTitle(e.target.value));
                    }}
                    placeholder="patagonia-glaciers-fjords"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 font-mono text-xs text-amber-200 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="dest-location"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Specific Locations
                  </label>
                  <input
                    id="dest-location"
                    type="text"
                    required
                    value={destLocation}
                    onChange={(e) => setDestLocation(e.target.value)}
                    placeholder="Torres del Paine & El Calafate"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-country"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Country
                  </label>
                  <input
                    id="dest-country"
                    type="text"
                    required
                    value={destCountry}
                    onChange={(e) => setDestCountry(e.target.value)}
                    placeholder="Chile & Argentina"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-region"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Region
                  </label>
                  <select
                    id="dest-region"
                    value={destRegion}
                    onChange={(e) => setDestRegion(e.target.value as Region)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none"
                  >
                    {AVAILABLE_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div>
                  <label
                    htmlFor="dest-days"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Days
                  </label>
                  <input
                    id="dest-days"
                    type="number"
                    min={1}
                    value={destDays}
                    onChange={(e) => setDestDays(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-nights"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Nights
                  </label>
                  <input
                    id="dest-nights"
                    type="number"
                    min={0}
                    value={destNights}
                    onChange={(e) => setDestNights(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-guests"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Max Guests
                  </label>
                  <input
                    id="dest-guests"
                    type="number"
                    min={1}
                    value={destMaxGuests}
                    onChange={(e) => setDestMaxGuests(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-price"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Base Price ($)
                  </label>
                  <input
                    id="dest-price"
                    type="number"
                    min={100}
                    value={destBasePrice}
                    onChange={(e) => setDestBasePrice(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-upgrade"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Private + ($)
                  </label>
                  <input
                    id="dest-upgrade"
                    type="number"
                    min={0}
                    value={destPrivateUpgrade}
                    onChange={(e) => setDestPrivateUpgrade(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dest-season"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Best Season
                  </label>
                  <input
                    id="dest-season"
                    type="text"
                    value={destSeason}
                    onChange={(e) => setDestSeason(e.target.value)}
                    placeholder="November – March"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-rating"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Curated Rating
                  </label>
                  <input
                    id="dest-rating"
                    type="text"
                    value={destRating}
                    onChange={(e) => setDestRating(e.target.value)}
                    placeholder="5.0"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cover Photo Upload or URL */}
              <div className="rounded-2xl border border-white/15 bg-slate-950/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Main Destination Cover Photo
                    </div>
                    <p className="text-xs text-slate-400">
                      Upload a photo file or paste an image URL for the card and hero banner.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20">
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Upload Cover Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMainPhotoUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={destImage.startsWith('data:') ? 'Uploaded photo ready' : destImage}
                    onChange={(e) => setDestImage(e.target.value)}
                    placeholder="https://... or upload an image file above"
                    className="flex-1 rounded-xl border border-white/20 bg-slate-950/65 px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                  {destImage && (
                    <img
                      src={destImage}
                      alt="Destination preview"
                      className="h-16 w-28 rounded-lg border border-white/15 object-cover shrink-0"
                    />
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="dest-summary"
                  className="block text-xs font-medium text-slate-200"
                >
                  Overview Summary
                </label>
                <textarea
                  id="dest-summary"
                  rows={2}
                  required
                  value={destSummary}
                  onChange={(e) => setDestSummary(e.target.value)}
                  placeholder="Describe the signature villas, excursions, and atmosphere guests will experience..."
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dest-highlights"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Experience Highlights (one per line)
                  </label>
                  <textarea
                    id="dest-highlights"
                    rows={3}
                    value={destHighlights}
                    onChange={(e) => setDestHighlights(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dest-included"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Included in Booking (one per line)
                  </label>
                  <textarea
                    id="dest-included"
                    rows={3}
                    value={destIncluded}
                    onChange={(e) => setDestIncluded(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="dest-departures"
                  className="block text-xs font-medium text-slate-200"
                >
                  Departure Dates (comma-separated)
                </label>
                <input
                  id="dest-departures"
                  type="text"
                  value={destDepartures}
                  onChange={(e) => setDestDepartures(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-amber-300 focus:outline-none"
                />
              </div>

              {/* Day-by-Day Itinerary Builder with Per-Day Location Photos */}
              <div className="border-t border-white/12 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-white">
                      Day-by-Day Places &amp; Photos
                    </h3>
                    <p className="text-xs text-slate-300">
                      Add each day’s stop and upload a photo showing where customers will be taken.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItineraryDay}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Day
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {itineraryDays.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/15 bg-slate-950/50 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <input
                            type="text"
                            aria-label={`Day label ${idx + 1}`}
                            value={step.day}
                            onChange={(e) =>
                              setItineraryDays((prev) =>
                                prev.map((d, i) =>
                                  i === idx ? { ...d, day: e.target.value } : d
                                )
                              )
                            }
                            className="w-24 rounded-lg border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-amber-200 tabular-nums focus:border-amber-300 focus:outline-none"
                          />
                          <input
                            type="text"
                            aria-label={`Day ${idx + 1} stop title`}
                            value={step.title}
                            onChange={(e) =>
                              setItineraryDays((prev) =>
                                prev.map((d, i) =>
                                  i === idx ? { ...d, title: e.target.value } : d
                                )
                              )
                            }
                            placeholder="Destination spot or excursion title"
                            className="min-w-[200px] flex-1 rounded-lg border border-white/20 bg-slate-950/75 px-3 py-1.5 text-xs font-medium text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                          />
                        </div>

                        {itineraryDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItineraryDay(idx)}
                            aria-label={`Remove ${step.day}`}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        aria-label={`Day ${idx + 1} details`}
                        value={step.detail}
                        onChange={(e) =>
                          setItineraryDays((prev) =>
                            prev.map((d, i) =>
                              i === idx ? { ...d, detail: e.target.value } : d
                            )
                          )
                        }
                        placeholder="Describe where the customer will be taken and what they will experience..."
                        className="w-full rounded-lg border border-white/20 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/15">
                          <ImagePlus className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />
                          Upload Day Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleDayPhotoUpload(idx, e)}
                            className="sr-only"
                          />
                        </label>
                        <input
                          type="text"
                          aria-label={`Day ${idx + 1} image URL`}
                          value={
                            step.image?.startsWith('data:')
                              ? 'Day photo uploaded'
                              : step.image || ''
                          }
                          onChange={(e) =>
                            setItineraryDays((prev) =>
                              prev.map((d, i) =>
                                i === idx ? { ...d, image: e.target.value } : d
                              )
                            )
                          }
                          placeholder="or paste day photo URL..."
                          className="min-w-[180px] flex-1 rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1 text-xs text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
                        />
                        {step.image && (
                          <img
                            src={step.image}
                            alt={`${step.day} location preview`}
                            className="h-11 w-16 rounded-md border border-white/15 object-cover shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {destError && (
                <p role="alert" className="text-xs font-medium text-amber-300">
                  {destError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingDest}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {submittingDest
                  ? 'Publishing Destination...'
                  : 'Publish Destination to Portal'}
              </button>
            </form>
          </section>

          {/* Existing Owner-Added Destinations Sidebar */}
          <aside className="glass-panel rounded-3xl p-7 lg:col-span-4 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">
                Owner-Added Destinations
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                Custom routes published alongside your 6 flagship destinations.
              </p>
            </div>

            {customDestinations.length === 0 ? (
              <div className="rounded-2xl border border-white/12 bg-slate-950/40 p-5 text-xs text-slate-300 leading-relaxed">
                No custom destinations added yet. Use the form on the left to add a new place with its cover photo, pricing, highlights, and day-by-day excursion photos.
              </div>
            ) : (
              <div className="space-y-4">
                {customDestinations.map((pkg) => (
                  <div
                    key={pkg.slug}
                    className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50"
                  >
                    <img
                      src={pkg.image}
                      alt={pkg.title}
                      referrerPolicy="no-referrer"
                      className="h-32 w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="text-xs text-amber-200 tabular-nums">
                        {pkg.country} · {pkg.region} · ${pkg.basePrice.toLocaleString()}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-white">
                        {pkg.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 tabular-nums">
                        {pkg.days}D / {pkg.nights}N · {pkg.itinerary.length} itinerary stops
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => onOpenPackage(pkg.slug)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:text-white"
                        >
                          Open Page
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        {pkg.id && (
                          confirmDeleteId === pkg.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={deletingId === pkg.id}
                                onClick={() => handleDeleteDestination(pkg.id!)}
                                className="rounded-lg bg-rose-500/85 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                              >
                                {deletingId === pkg.id ? 'Removing...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-slate-300 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(pkg.id!)}
                              className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        <>
          {/* Package Profit Breakdown + Log Expense/Loss */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <section className="glass-panel rounded-3xl p-7 lg:col-span-7">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Route Profitability
                </h2>
                <span className="text-xs text-slate-300 tabular-nums">
                  {summary.totalGuests} booked travelers
                </span>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/12 text-xs font-medium text-slate-300">
                      <th className="pb-3 pr-4">Package</th>
                      <th className="pb-3 pr-4 text-right">Guests</th>
                      <th className="pb-3 pr-4 text-right">Earnings</th>
                      <th className="pb-3 pr-4 text-right">Cost</th>
                      <th className="pb-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {packageBreakdown.map((item) => {
                      const margin =
                        item.revenue > 0
                          ? Math.round((item.profit / item.revenue) * 100)
                          : 0;
                      return (
                        <tr key={item.packageSlug} className="hover:bg-white/5">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-white">
                              {item.packageTitle}
                            </div>
                            <div className="text-xs text-slate-300">
                              {item.destination} · {item.bookingsCount}{' '}
                              {item.bookingsCount === 1 ? 'booking' : 'bookings'}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-200 tabular-nums">
                            {item.guests}
                          </td>
                          <td className="py-3 pr-4 text-right text-white tabular-nums">
                            ${item.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-300 tabular-nums">
                            ${item.cost.toLocaleString()}
                          </td>
                          <td className="py-3 text-right tabular-nums">
                            <span className="font-semibold text-emerald-400">
                              ${item.profit.toLocaleString()}
                            </span>
                            <span className="ml-1.5 text-xs text-slate-400">
                              ({margin}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Log Operating Expense or Loss */}
            <section className="glass-panel rounded-3xl p-7 lg:col-span-5">
              <h2 className="font-display text-2xl font-semibold text-white">
                Record Expense or Loss
              </h2>
              <p className="mt-1 text-xs text-slate-300">
                Entries update your Net Profit and Loss ledger in real time.
              </p>

              <form onSubmit={handleAddEntry} className="mt-5 space-y-3.5">
                <div>
                  <label
                    htmlFor="exp-title"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Description
                  </label>
                  <input
                    id="exp-title"
                    type="text"
                    required
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    placeholder="e.g., Santorini Transfer Vendor Fee"
                    className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="exp-type"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Entry Type
                    </label>
                    <select
                      id="exp-type"
                      value={entryType}
                      onChange={(e) =>
                        setEntryType(e.target.value as 'expense' | 'loss')
                      }
                      className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none"
                    >
                      <option value="expense">Operating Expense</option>
                      <option value="loss">Loss / Write-off</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="exp-amount"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Amount (USD)
                    </label>
                    <input
                      id="exp-amount"
                      type="number"
                      min={1}
                      required
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="850"
                      className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="exp-cat"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Category
                  </label>
                  <select
                    id="exp-cat"
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none"
                  >
                    <option value="Villa Partner">Villa Partner</option>
                    <option value="Charter & Rail">Charter &amp; Rail</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Refund / Loss">Refund / Loss</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submittingEntry}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {submittingEntry ? 'Saving...' : 'Add to Financial Ledger'}
                </button>
              </form>

              <div className="mt-6 border-t border-white/12 pt-4">
                <h3 className="text-xs font-semibold text-slate-200">
                  Recent Expenses &amp; Losses
                </h3>
                <div className="mt-3 max-h-48 space-y-2.5 overflow-y-auto pr-1">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between border-b border-white/8 pb-2 text-xs last:border-b-0"
                    >
                      <div>
                        <div className="font-medium text-white">{exp.title}</div>
                        <div className="text-slate-400">
                          {exp.category} · {exp.recordedDate}
                        </div>
                      </div>
                      <div
                        className={`font-semibold tabular-nums ${
                          exp.entryType === 'loss'
                            ? 'text-rose-400'
                            : 'text-amber-200'
                        }`}
                      >
                        -${exp.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Live Bookings Ledger */}
          <section className="glass-panel rounded-3xl p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">
                  Customer Bookings Ledger
                </h2>
                <p className="text-xs text-slate-300">
                  Update status to reflect refunds, cancellations, or confirmed departures.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-slate-950/50 p-1">
                {(['all', 'confirmed', 'pending', 'refunded'] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBookingFilter(tab)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        bookingFilter === tab
                          ? 'bg-white text-slate-950'
                          : 'text-slate-200 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/12 text-xs font-medium text-slate-300">
                    <th className="pb-3 pr-4">Ref</th>
                    <th className="pb-3 pr-4">Customer</th>
                    <th className="pb-3 pr-4">Package &amp; Date</th>
                    <th className="pb-3 pr-4 text-right">Revenue</th>
                    <th className="pb-3 pr-4 text-right">Net Impact</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleBookings.map((b) => {
                    const isLoss =
                      b.status === 'refunded' || b.status === 'cancelled';
                    const net = isLoss
                      ? -Math.max(450, Math.round(b.cost * 0.28))
                      : b.revenue - b.cost;
                    return (
                      <tr key={b.id} className="hover:bg-white/5">
                        <td className="py-3 pr-4 font-mono text-xs text-amber-200 tabular-nums">
                          {b.reference}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-white">
                            {b.customerName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {b.customerEmail}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-white">{b.packageTitle}</div>
                          <div className="text-xs text-slate-300 tabular-nums">
                            {b.departureDate} · {b.guests} guests · {b.tier}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-white tabular-nums">
                          ${b.revenue.toLocaleString()}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-semibold tabular-nums ${
                            net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {net >= 0
                            ? `+$${net.toLocaleString()}`
                            : `-$${Math.abs(net).toLocaleString()}`}
                        </td>
                        <td className="py-3 text-right">
                          <select
                            aria-label={`Status for ${b.reference}`}
                            value={b.status}
                            onChange={(e) =>
                              handleBookingStatusChange(b.id, e.target.value)
                            }
                            className="rounded-lg border border-white/20 bg-slate-950/75 px-2.5 py-1 text-xs font-medium text-white focus:border-amber-300 focus:outline-none"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="refunded">Refunded</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Corporate / Group Inquiries Queue */}
          <section className="glass-panel rounded-3xl p-7">
            <h2 className="font-display text-2xl font-semibold text-white">
              Corporate &amp; Group Proposals Queue
            </h2>
            <div className="mt-4 divide-y divide-white/10">
              {inquiries.length === 0 ? (
                <p className="py-4 text-sm text-slate-300">
                  No custom group proposals queued yet.
                </p>
              ) : (
                inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-amber-200 tabular-nums">
                        <span>{inq.reference}</span>
                        <span aria-hidden="true">·</span>
                        <span>{inq.groupSize} guests</span>
                        <span aria-hidden="true">·</span>
                        <span>{inq.destination}</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {inq.companyOrName}{' '}
                        <span className="font-normal text-slate-300">
                          ({inq.email})
                        </span>
                      </div>
                      {inq.details && (
                        <p className="mt-1 text-xs text-slate-300">{inq.details}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        aria-label={`Inquiry status for ${inq.reference}`}
                        value={inq.status}
                        onChange={(e) =>
                          handleInquiryStatusChange(inq.id, e.target.value)
                        }
                        className="rounded-lg border border-white/20 bg-slate-950/75 px-3 py-1.5 text-xs font-medium text-white focus:border-amber-300 focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="quoted">Quoted</option>
                        <option value="closed">Closed</option>
                      </select>
                      <a
                        href={`mailto:${inq.email}?subject=Meridian%20Voyages%20Proposal%20${inq.reference}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                      >
                        Reply
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
