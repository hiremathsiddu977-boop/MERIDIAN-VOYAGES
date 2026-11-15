import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Compass,
  Copy,
  Minus,
  Plus,
  Search,
} from 'lucide-react';
import heroBackdrop from './assets/images/hero_unreal_destination_1794754248031.jpg';
import {
  AVAILABLE_REGIONS,
  Region,
  TRAVEL_PACKAGES,
  TravelPackage,
} from './data/packages';
import { AuthUser, HomeLoginView } from './components/HomeLoginView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { ChatPanelMode, GeminiChatbot } from './components/GeminiChatbot';

type SortOption = 'featured' | 'price-asc' | 'days-asc';
type RegionFilter = 'All' | Region;

function regionSlug(region: string): string {
  return region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseRoute(pathname: string): {
  view: 'storefront' | 'home' | 'owner' | 'package' | 'inquire';
  slug?: string;
  region?: RegionFilter;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/home' || clean === '/login') {
    return { view: 'home' };
  }
  if (clean === '/owner') {
    return { view: 'owner' };
  }
  if (clean.startsWith('/packages/')) {
    return { view: 'package', slug: clean.slice('/packages/'.length) };
  }
  if (clean.startsWith('/destinations/')) {
    const raw = clean.slice('/destinations/'.length).toLowerCase();
    const matched = AVAILABLE_REGIONS.find((r) => regionSlug(r) === raw);
    return { view: 'storefront', region: matched || 'All' };
  }
  if (clean === '/inquire') {
    return { view: 'inquire' };
  }
  return { view: 'storefront', region: 'All' };
}

function ImageFrame({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-center text-slate-300">
          <Compass className="h-6 w-6 text-amber-300" aria-hidden="true" />
          <span className="text-sm font-medium">{alt}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const route = useMemo(() => parseRoute(pathname), [pathname]);

  // Auth state stored strictly in memory (never localStorage)
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<RegionFilter>(route.region || 'All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [chatMode, setChatMode] = useState<ChatPanelMode>('minimized');
  const [customPackages, setCustomPackages] = useState<TravelPackage[]>([]);

  const refreshCustomPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/packages');
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.packages)) {
        setCustomPackages(json.packages);
      }
    } catch {
      // Built-in packages remain immediately available
    }
  }, []);

  useEffect(() => {
    refreshCustomPackages();
  }, [refreshCustomPackages]);

  const allPackages = useMemo(
    () => [...TRAVEL_PACKAGES, ...customPackages],
    [customPackages]
  );

  const regionTabs = useMemo<RegionFilter[]>(() => {
    const base: RegionFilter[] = ['All', 'Europe', 'Asia', 'Nordics'];
    const extras = new Set<Region>();
    for (const pkg of allPackages) {
      if (!base.includes(pkg.region)) {
        extras.add(pkg.region);
      }
    }
    return [...base, ...Array.from(extras)];
  }, [allPackages]);

  const activePackage = useMemo<TravelPackage | undefined>(() => {
    if (route.view !== 'package' || !route.slug) return undefined;
    return allPackages.find((p) => p.slug === route.slug);
  }, [route, allPackages]);

  useEffect(() => {
    if (route.region) setRegion(route.region);
    if (route.view === 'owner') {
      document.title = 'Owner Profit & Loss Console — Meridian Voyages';
    } else if (route.view === 'home') {
      document.title = 'Home Login — Meridian Voyages';
    } else if (activePackage) {
      document.title = `${activePackage.title} — Meridian Voyages`;
    } else if (route.view === 'inquire') {
      document.title = 'Business & Group Inquiry — Meridian Voyages';
    } else if (region !== 'All') {
      document.title = `${region} Packages — Meridian Voyages`;
    } else {
      document.title = 'Meridian Voyages — Curated Global Travel Packages';
    }
  }, [route, activePackage, region]);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to: string, scrollTop = true) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRegionChange = (next: RegionFilter) => {
    setRegion(next);
    const targetUrl =
      next === 'All' ? '/' : `/destinations/${regionSlug(next)}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
      setPathname(targetUrl);
    }
  };

  const handleAuthenticated = (nextUser: AuthUser, token: string) => {
    setUser(nextUser);
    setAuthToken(token);
    if (nextUser.role === 'owner') {
      navigate('/owner');
    } else {
      navigate('/');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setAuthToken(null);
    navigate('/home');
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allPackages.filter((pkg) => {
      const matchesRegion = region === 'All' || pkg.region === region;
      if (!matchesRegion) return false;
      if (!q) return true;
      return (
        pkg.title.toLowerCase().includes(q) ||
        pkg.country.toLowerCase().includes(q) ||
        pkg.location.toLowerCase().includes(q) ||
        pkg.summary.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.basePrice - b.basePrice);
    }
    if (sortBy === 'days-asc') {
      return [...list].sort((a, b) => a.days - b.days);
    }
    return list;
  }, [allPackages, search, region, sortBy]);

  return (
    <div className="relative min-h-screen text-slate-100">
      {/* Fixed Unreal Touristy Backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <img
          src={heroBackdrop}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center scale-[1.02]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/42 to-slate-950/88"
          aria-hidden="true"
        />
      </div>

      {/* Strict 3-Zone Top Bar */}
      <header className="glass-bar sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setSearch('');
              handleRegionChange('All');
              navigate('/');
            }}
            className="font-display text-2xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
          >
            Meridian Voyages
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-200"
          >
            <a
              href="/home"
              onClick={(e) => {
                e.preventDefault();
                navigate('/home');
              }}
              className={`whitespace-nowrap shrink-0 border-b pb-0.5 transition-colors duration-150 ${
                route.view === 'home'
                  ? 'border-amber-300 text-white'
                  : 'border-transparent text-slate-200/85 hover:border-white/50 hover:text-white'
              }`}
            >
              Home
            </a>

            {(
              [
                { label: 'Packages', val: 'All' as RegionFilter, path: '/' },
                {
                  label: 'Europe',
                  val: 'Europe' as RegionFilter,
                  path: '/destinations/europe',
                },
                {
                  label: 'Asia',
                  val: 'Asia' as RegionFilter,
                  path: '/destinations/asia',
                },
                {
                  label: 'Nordics',
                  val: 'Nordics' as RegionFilter,
                  path: '/destinations/nordics',
                },
              ] as const
            ).map((item) => {
              const active =
                route.view === 'storefront' && region === item.val;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleRegionChange(item.val);
                    navigate(item.path, false);
                  }}
                  className={`whitespace-nowrap shrink-0 border-b pb-0.5 transition-colors duration-150 ${
                    active
                      ? 'border-amber-300 text-white'
                      : 'border-transparent text-slate-200/85 hover:border-white/50 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {user?.role === 'owner' ? (
              <a
                href="/owner"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/owner');
                }}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-colors duration-150 hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                Owner Console
              </a>
            ) : user ? (
              <a
                href="/home"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/home');
                }}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-colors duration-150 hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                My Account
              </a>
            ) : (
              <a
                href="/home"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/home');
                }}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-colors duration-150 hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        {route.view === 'owner' ? (
          user?.role === 'owner' && authToken ? (
            <OwnerDashboard
              token={authToken}
              ownerEmail={user.email}
              onOpenStorefront={() => navigate('/')}
              onOpenPackage={(slug) => navigate(`/packages/${slug}`)}
              onDestinationsChanged={refreshCustomPackages}
              onSignOut={handleSignOut}
            />
          ) : (
            <HomeLoginView
              user={user}
              token={authToken}
              onAuthenticated={handleAuthenticated}
              onSignOut={handleSignOut}
              onNavigatePackages={() => navigate('/')}
              onOpenOwnerConsole={() => navigate('/owner')}
            />
          )
        ) : route.view === 'home' ? (
          <HomeLoginView
            user={user}
            token={authToken}
            onAuthenticated={handleAuthenticated}
            onSignOut={handleSignOut}
            onNavigatePackages={() => navigate('/')}
            onOpenOwnerConsole={() => navigate('/owner')}
          />
        ) : route.view === 'package' && activePackage ? (
          <PackageDetailView
            pkg={activePackage}
            user={user}
            onBack={() => navigate('/')}
            onManageTrips={() => navigate('/home')}
          />
        ) : route.view === 'package' && !activePackage ? (
          <div className="glass-panel mx-auto max-w-xl rounded-2xl p-10 text-center">
            <h1 className="font-display text-3xl font-semibold text-white">
              Package not found
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              The requested itinerary link is unavailable. Browse our current global departures below.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Packages
            </button>
          </div>
        ) : route.view === 'inquire' ? (
          <BusinessInquiryView
            user={user}
            packages={allPackages}
            onBack={() => navigate('/')}
          />
        ) : (
          <>
            {/* Hero & Instant Finder */}
            <section className="glass-panel rounded-3xl p-8 md:p-12">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-amber-200/95">
                  Private &amp; Corporate Travel Portal · Instant Departures
                </p>
                <h1 className="font-display mt-3 text-[clamp(2.35rem,4.5vw,3.9rem)] font-semibold leading-[1.06] tracking-tight text-white [text-wrap:balance]">
                  Iconic places, reserved in seconds.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200">
                  Direct booking for private retreats, executive offsites, and curated escapes across Europe, Asia, and the Nordics—transparent pricing and instant itinerary confirmation.
                </p>
              </div>

              {/* Instant Search + Filter Controls */}
              <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Santorini, Kyoto, Alps, Bali..."
                    aria-label="Search travel packages"
                    className="w-full rounded-xl border border-white/20 bg-slate-950/55 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-300/75 focus:border-amber-300 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="group"
                    aria-label="Filter by region"
                    className="flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-slate-950/50 p-1"
                  >
                    {regionTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => handleRegionChange(tab)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                          region === tab
                            ? 'bg-white text-slate-950'
                            : 'text-slate-200 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <select
                    aria-label="Sort packages"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2 text-xs font-medium text-white focus:border-amber-300 focus:outline-none"
                  >
                    <option value="featured">Sort: Curated</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="days-asc">Duration: Shortest</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Curated Packages Grid */}
            <section className="mt-10" aria-labelledby="packages-heading">
              <div className="mb-6 flex items-baseline justify-between gap-4">
                <h2
                  id="packages-heading"
                  className="font-display text-3xl font-semibold tracking-tight text-white"
                >
                  Featured Destinations
                </h2>
                <span className="text-xs font-medium text-slate-200 tabular-nums">
                  {filteredPackages.length}{' '}
                  {filteredPackages.length === 1 ? 'package' : 'packages'} ready
                </span>
              </div>

              {filteredPackages.length === 0 ? (
                <div className="glass-panel rounded-2xl p-10 text-center">
                  <p className="text-base font-medium text-white">
                    No packages match “{search}”.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      handleRegionChange('All');
                    }}
                    className="mt-4 rounded-lg border border-white/25 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPackages.map((pkg) => (
                    <article
                      key={pkg.slug}
                      onClick={() => navigate(`/packages/${pkg.slug}`)}
                      className="glass-panel group flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-transform duration-150 ease-out hover:-translate-y-0.5"
                    >
                      <ImageFrame
                        src={pkg.image}
                        alt={`${pkg.title} in ${pkg.country}`}
                        className="aspect-[4/3] w-full"
                      />

                      <div className="flex flex-1 flex-col justify-between p-6">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-amber-200/90 tabular-nums">
                            <span>{pkg.country}</span>
                            <span aria-hidden="true">·</span>
                            <span>{pkg.days} Days</span>
                            <span aria-hidden="true">·</span>
                            <span>Max {pkg.maxGuests} guests</span>
                          </div>

                          <h3 className="font-display mt-2 text-2xl font-semibold leading-snug text-white">
                            {pkg.title}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-200/90">
                            {pkg.summary}
                          </p>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-white/12 pt-4">
                          <div>
                            <span className="text-lg font-semibold text-white tabular-nums">
                              ${pkg.basePrice.toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-slate-300">
                              / guest
                            </span>
                          </div>

                          <a
                            href={`/packages/${pkg.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/packages/${pkg.slug}`);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200 transition-colors group-hover:text-white whitespace-nowrap shrink-0"
                          >
                            View Package
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Business Travel & Proof Strip */}
            <section className="glass-panel mt-12 rounded-3xl p-8 md:p-10">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <h2 className="font-display text-3xl font-semibold text-white [text-wrap:balance]">
                    Built for executive retreats and private group departures.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200">
                    Every itinerary includes vetted cliffside properties, private airport transfers, and single-invoice corporate billing without agency back-and-forth.
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-6 border-t border-white/12 pt-6">
                    <div>
                      <div className="text-2xl font-semibold text-white tabular-nums">
                        {allPackages.length}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Flagship routes
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-white tabular-nums">
                        24 hr
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Custom buyout hold
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-white tabular-nums">
                        4.9 / 5
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Verified client rating
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 border-t border-white/12 pt-6 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <p className="text-sm leading-relaxed text-slate-200">
                    Planning an offsite for 6 to 24 guests or need tailored flight-and-villa dates?
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/inquire')}
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
                  >
                    Request Group Proposal
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-white/12 bg-slate-950/65 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-slate-300 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="font-display text-base font-semibold text-white">
              Meridian Voyages
            </span>
            <span aria-hidden="true">·</span>
            <span>concierge@meridianvoyages.com</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="/home"
              onClick={(e) => {
                e.preventDefault();
                navigate('/home');
              }}
              className="hover:text-white transition-colors"
            >
              Home Login
            </a>
            {TRAVEL_PACKAGES.slice(0, 3).map((p) => (
              <a
                key={p.slug}
                href={`/packages/${p.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/packages/${p.slug}`);
                }}
                className="hover:text-white transition-colors"
              >
                {p.country}
              </a>
            ))}
            {chatMode === 'closed' && (
              <button
                type="button"
                onClick={() => setChatMode('open')}
                className="text-amber-200 hover:text-white transition-colors"
              >
                Open Chat
              </button>
            )}
            <span className="text-slate-400">© 2027 Meridian Voyages</span>
          </div>
        </div>
      </footer>

      <GeminiChatbot
        userRole={user?.role ?? null}
        token={authToken}
        mode={chatMode}
        onModeChange={setChatMode}
        packages={allPackages}
        onNavigate={(path) => {
          if (path === '/') {
            setSearch('');
            handleRegionChange('All');
          }
          navigate(path);
        }}
      />
    </div>
  );
}

function PackageDetailView({
  pkg,
  user,
  onBack,
  onManageTrips,
}: {
  pkg: TravelPackage;
  user: AuthUser | null;
  onBack: () => void;
  onManageTrips: () => void;
}) {
  const [departure, setDeparture] = useState(pkg.departures[0]);
  const [guestsInput, setGuestsInput] = useState('2');
  const [tier, setTier] = useState<'signature' | 'private'>('signature');
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const guests = Math.max(1, Math.floor(Number(guestsInput) || 1));

  useEffect(() => {
    setDeparture(pkg.departures[0]);
    setGuestsInput('2');
    setTier('signature');
    setBookingRef(null);
    setError('');
  }, [pkg]);

  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name);
      if (!email) setEmail(user.email);
    }
  }, [user, fullName, email]);

  const unitPrice =
    pkg.basePrice + (tier === 'private' ? pkg.privateUpgrade : 0);
  const totalPrice = unitPrice * guests;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid work or personal email.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageSlug: pkg.slug,
          packageTitle: pkg.title,
          destination: pkg.country,
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          departureDate: departure,
          guests,
          tier,
          unitPrice,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to reserve package.');
      setBookingRef(json.booking.reference);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Clean Human Breadcrumb + Share Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-white hover:text-amber-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All Packages
          </button>
          <span aria-hidden="true">/</span>
          <span>{pkg.region}</span>
          <span aria-hidden="true">/</span>
          <span className="text-amber-200">{pkg.title}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur-md transition-colors hover:border-white/40"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              Link Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy Package URL
            </>
          )}
        </button>
      </div>

      {/* 2-Column Split: Details Left + Sticky Booking Right */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <div className="glass-panel overflow-hidden rounded-3xl">
            <ImageFrame
              src={pkg.image}
              alt={pkg.title}
              className="aspect-[16/10] w-full"
            />
            <div className="p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-200 tabular-nums">
                <span>
                  {pkg.location}, {pkg.country}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {pkg.days} Days / {pkg.nights} Nights
                </span>
                <span aria-hidden="true">·</span>
                <span>Best {pkg.season}</span>
                <span aria-hidden="true">·</span>
                <span>Rated {pkg.rating}</span>
              </div>

              <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-white [text-wrap:balance]">
                {pkg.title}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-slate-200">
                {pkg.summary}
              </p>

              <div className="mt-8 border-t border-white/12 pt-6">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Experience Highlights
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pkg.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <h2 className="font-display text-2xl font-semibold text-white">
              Day-by-Day Itinerary &amp; Destinations
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              Each day’s stop and curated location photo where you will be taken.
            </p>
            <div className="mt-5 divide-y divide-white/12">
              {pkg.itinerary.map((step, idx) => (
                <div
                  key={`${step.day}-${idx}`}
                  className="grid grid-cols-1 gap-4 py-5 first:pt-2 last:pb-0 sm:grid-cols-12 sm:items-start"
                >
                  <div className="sm:col-span-4">
                    {step.image ? (
                      <ImageFrame
                        src={step.image}
                        alt={`${step.day}: ${step.title}`}
                        className="aspect-[16/10] w-full rounded-xl border border-white/15"
                      />
                    ) : (
                      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-white/15 bg-slate-950/50 text-xs font-semibold text-amber-200 tabular-nums">
                        {step.day}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-8">
                    <div className="text-xs font-semibold tracking-wide text-amber-200 tabular-nums">
                      {step.day}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-white/12 pt-6">
              <h2 className="font-display text-2xl font-semibold text-white">
                Included in Every Booking
              </h2>
              <ul className="mt-4 space-y-2.5">
                {pkg.included.map((inc) => (
                  <li
                    key={inc}
                    className="flex items-start gap-2.5 text-sm text-slate-200"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
                      aria-hidden="true"
                    />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sticky Reservation Panel */}
        <aside className="glass-panel rounded-3xl p-7 lg:sticky lg:top-24 lg:col-span-5">
          {bookingRef ? (
            <div>
              <p className="text-xs font-semibold text-amber-200 tabular-nums">
                Confirmed · Reference {bookingRef}
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold text-white">
                Itinerary Reserved
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                Thank you, {fullName}. Your reservation for{' '}
                <span className="font-medium text-white">{pkg.title}</span> has
                been saved for{' '}
                <span className="font-medium text-white">{email}</span>.
              </p>

              <div className="mt-6 space-y-2.5 border-y border-white/12 py-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Departure</span>
                  <span className="font-medium text-white tabular-nums">
                    {departure}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Travelers</span>
                  <span className="font-medium text-white tabular-nums">
                    {guests} {guests === 1 ? 'guest' : 'guests'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Package Tier</span>
                  <span className="font-medium text-white">
                    {tier === 'private'
                      ? 'Private Suite & Chauffeur'
                      : 'Signature Small Group'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 text-base font-semibold">
                  <span className="text-white">Total Confirmed</span>
                  <span className="text-amber-200 tabular-nums">
                    ${totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onManageTrips}
                  className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100"
                >
                  View or Cancel in My Trips
                </button>
                <button
                  type="button"
                  onClick={() => setBookingRef(null)}
                  className="w-full rounded-xl border border-white/25 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Book Another Departure
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReserve} noValidate>
              <div className="flex items-baseline justify-between border-b border-white/12 pb-5">
                <div>
                  <span className="text-3xl font-semibold text-white tabular-nums">
                    ${unitPrice.toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-300">
                    per traveler
                  </span>
                </div>
                <span className="text-xs font-medium text-amber-200 tabular-nums">
                  {pkg.days}D / {pkg.nights}N
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="departure-select"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Departure Date
                  </label>
                  <select
                    id="departure-select"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/65 px-3.5 py-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                  >
                    {pkg.departures.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="travelers-input"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Travelers (Type any count)
                  </label>
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-slate-950/55 px-2.5 py-1.5 focus-within:border-amber-300">
                    <button
                      type="button"
                      aria-label="Decrease guests"
                      onClick={() =>
                        setGuestsInput(String(Math.max(1, guests - 1)))
                      }
                      className="rounded-lg p-1.5 text-slate-200 hover:bg-white/10 hover:text-white shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      id="travelers-input"
                      type="text"
                      inputMode="numeric"
                      aria-label="Number of travelers"
                      value={guestsInput}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                        setGuestsInput(digitsOnly);
                      }}
                      onBlur={() => {
                        if (!guestsInput || Number(guestsInput) < 1) {
                          setGuestsInput('1');
                        } else {
                          setGuestsInput(String(Math.floor(Number(guestsInput))));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setGuestsInput(String(guests + 1));
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setGuestsInput(String(Math.max(1, guests - 1)));
                        }
                      }}
                      placeholder="1"
                      className="w-full bg-transparent text-center text-sm font-semibold text-white tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Increase guests"
                      onClick={() => setGuestsInput(String(guests + 1))}
                      className="rounded-lg p-1.5 text-slate-200 hover:bg-white/10 hover:text-white shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-200">
                    Accommodation Tier
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-slate-950/50 p-1">
                    <button
                      type="button"
                      onClick={() => setTier('signature')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        tier === 'signature'
                          ? 'bg-white text-slate-950'
                          : 'text-slate-200 hover:text-white'
                      }`}
                    >
                      Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setTier('private')}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors tabular-nums ${
                        tier === 'private'
                          ? 'bg-white text-slate-950'
                          : 'text-slate-200 hover:text-white'
                      }`}
                    >
                      Private (+${pkg.privateUpgrade})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1">
                  <div>
                    <label
                      htmlFor="guest-name"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Full Name
                    </label>
                    <input
                      id="guest-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Elena Rostova"
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="guest-email"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Email Address
                    </label>
                    <input
                      id="guest-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="elena@company.com"
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="guest-notes"
                      className="block text-xs font-medium text-slate-200"
                    >
                      Company or Special Requests (Optional)
                    </label>
                    <input
                      id="guest-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Dietary notes, airport pickup, billing entity"
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-3 text-xs font-medium text-amber-300">
                  {error}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-white/12 pt-4 text-sm">
                <span className="text-slate-200">Estimated Total</span>
                <span className="text-xl font-semibold text-white tabular-nums">
                  ${totalPrice.toLocaleString()}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
              >
                {submitting ? 'Confirming...' : 'Reserve Package'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

function BusinessInquiryView({
  user,
  packages,
  onBack,
}: {
  user: AuthUser | null;
  packages: TravelPackage[];
  onBack: () => void;
}) {
  const [company, setCompany] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [destination, setDestination] = useState(packages[0]?.title || TRAVEL_PACKAGES[0].title);
  const [groupSize, setGroupSize] = useState('8');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      setError('Please enter your name or organization.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyOrName: company.trim(),
          email: email.trim(),
          destination,
          groupSize: Number(groupSize) || 8,
          details: details.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to submit proposal.');
      setSubmittedRef(json.inquiry.reference);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to send proposal request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-white hover:text-amber-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Packages
      </button>

      <div className="glass-panel rounded-3xl p-8 md:p-10">
        {submittedRef ? (
          <div>
            <p className="text-xs font-semibold text-amber-200 tabular-nums">
              Proposal Queued · Reference {submittedRef}
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-white">
              Request Received
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              Our travel desk has prepared a preliminary hold for{' '}
              <span className="font-medium text-white">{destination}</span> (
              {groupSize} guests) and sent details to{' '}
              <span className="font-medium text-white">{email}</span>.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100"
            >
              Return to Destinations
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h1 className="font-display text-3xl font-semibold text-white">
              Plan a Custom or Corporate Trip
            </h1>
            <p className="mt-2 text-sm text-slate-200">
              Direct concierge pricing for executive offsites, private villa buyouts, and multi-stop itineraries.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="inq-company"
                  className="block text-xs font-medium text-slate-200"
                >
                  Name or Organization
                </label>
                <input
                  id="inq-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Northstar Studio / Marcus Vance"
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inq-email"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Business Email
                  </label>
                  <input
                    id="inq-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="travel@northstar.co"
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="inq-guests"
                    className="block text-xs font-medium text-slate-200"
                  >
                    Group Size
                  </label>
                  <input
                    id="inq-guests"
                    type="number"
                    min={1}
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white tabular-nums focus:border-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="inq-dest"
                  className="block text-xs font-medium text-slate-200"
                >
                  Preferred Destination
                </label>
                <select
                  id="inq-dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/65 px-3.5 py-2.5 text-sm text-white focus:border-amber-300 focus:outline-none"
                >
                  {packages.map((p) => (
                    <option key={p.slug} value={p.title}>
                      {p.title} ({p.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inq-details"
                  className="block text-xs font-medium text-slate-200"
                >
                  Dates &amp; Requirements
                </label>
                <textarea
                  id="inq-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Preferred month, single-room count, conference space or private boat requests..."
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-xs font-medium text-amber-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Proposal Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
