import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Compass,
  MessageSquare,
  Minus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { TravelPackage } from '../data/packages';

export type ChatPanelMode = 'open' | 'minimized' | 'closed';

interface ChatAction {
  label: string;
  path: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  actions?: ChatAction[];
}

function regionSlug(region: string): string {
  return region
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeReplyText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

function findMentionedPackages(
  text: string,
  packages: TravelPackage[]
): TravelPackage[] {
  const lower = text.toLowerCase();
  const matched: TravelPackage[] = [];

  for (const pkg of packages) {
    const titleWords = pkg.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    const countryMatch = lower.includes(pkg.country.toLowerCase());
    const locationParts = pkg.location
      .toLowerCase()
      .split(/[,/&]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4);
    const locationMatch = locationParts.some((loc) => lower.includes(loc));
    const slugMatch = lower.includes(pkg.slug.toLowerCase());
    const titleMatch =
      lower.includes(pkg.title.toLowerCase()) ||
      titleWords.some(
        (w) =>
          !['escape', 'sanctuary', 'retreat', 'coast', 'private', 'charter', 'express', 'autumn', 'northern'].includes(
            w
          ) && lower.includes(w)
      );

    if (slugMatch || titleMatch || countryMatch || locationMatch) {
      matched.push(pkg);
    }
  }

  return matched;
}

function extractNavigationActions(
  text: string,
  packages: TravelPackage[],
  userRole: 'customer' | 'owner' | null
): ChatAction[] {
  const lower = text.toLowerCase();
  const actions: ChatAction[] = [];
  const seen = new Set<string>();

  const pushAction = (label: string, path: string) => {
    if (seen.has(path) || actions.length >= 3) return;
    seen.add(path);
    actions.push({ label, path });
  };

  for (const pkg of findMentionedPackages(text, packages)) {
    pushAction(`Open ${pkg.title}`, `/packages/${pkg.slug}`);
  }

  const regions = Array.from(new Set(packages.map((p) => p.region)));
  for (const reg of regions) {
    if (lower.includes(reg.toLowerCase())) {
      pushAction(`Browse ${reg}`, `/destinations/${regionSlug(reg)}`);
    }
  }

  if (
    /\b(cancel|my trips|my booking|bookings|sign in|login|account|log in|refund)\b/i.test(
      lower
    )
  ) {
    pushAction(
      userRole ? 'My Trips & Account' : 'Home Login & My Trips',
      '/home'
    );
  }

  if (/\b(group|corporate|offsite|quote|proposal|inquir|buyout)\b/i.test(lower)) {
    pushAction('Group Proposal Form', '/inquire');
  }

  if (
    /\b(owner|profit|p&l|revenue|margin|expense|loss|add destination|studio)\b/i.test(
      lower
    )
  ) {
    pushAction(
      userRole === 'owner' ? 'Open Owner Console' : 'Owner Sign In',
      userRole === 'owner' ? '/owner' : '/home'
    );
  }

  if (
    actions.length === 0 &&
    /\b(navigate|help|menu|pages|packages|destinations|explore|where|start)\b/i.test(
      lower
    )
  ) {
    pushAction('All Packages', '/');
    pushAction('Home Login & My Trips', '/home');
    pushAction('Group Proposal', '/inquire');
  }

  return actions;
}

function detectDirectNavigationTarget(
  query: string,
  packages: TravelPackage[],
  userRole: 'customer' | 'owner' | null
): ChatAction | null {
  const lower = query.trim().toLowerCase();
  const isNavVerb =
    /\b(go to|take me to|open|navigate to|show me|visit|jump to|bring me to)\b/i.test(
      lower
    ) ||
    /^(home|login|packages|owner|inquire|europe|asia|nordics)$/i.test(lower);

  if (!isNavVerb) return null;

  const matchedPkgs = findMentionedPackages(query, packages);
  if (matchedPkgs.length === 1) {
    return {
      label: `Open ${matchedPkgs[0].title}`,
      path: `/packages/${matchedPkgs[0].slug}`,
    };
  }

  if (/\b(owner|p&l|profit|dashboard|studio)\b/i.test(lower)) {
    return userRole === 'owner'
      ? { label: 'Owner Console', path: '/owner' }
      : { label: 'Owner Sign In', path: '/home' };
  }

  if (/\b(inquir|group|corporate|proposal|quote|offsite)\b/i.test(lower)) {
    return { label: 'Group Proposal Form', path: '/inquire' };
  }

  if (/\b(home|login|sign in|my trips|account|cancel)\b/i.test(lower)) {
    return {
      label: userRole ? 'My Trips & Account' : 'Home Login',
      path: '/home',
    };
  }

  const regions = Array.from(new Set(packages.map((p) => p.region)));
  for (const reg of regions) {
    if (lower.includes(reg.toLowerCase())) {
      return { label: `${reg} Packages`, path: `/destinations/${regionSlug(reg)}` };
    }
  }

  if (/\b(all packages|packages|storefront|main|destinations)\b/i.test(lower)) {
    return { label: 'All Packages', path: '/' };
  }

  return null;
}

function buildLocalConciergeReply(
  query: string,
  packages: TravelPackage[],
  userRole: 'customer' | 'owner' | null
): { text: string; actions: ChatAction[]; autoNavigatePath?: string } {
  const lower = query.toLowerCase();
  const directTarget = detectDirectNavigationTarget(query, packages, userRole);

  if (directTarget) {
    return {
      text: `Opening ${directTarget.label} for you now. You can also jump to any other section using the buttons below.`,
      actions: [directTarget, { label: 'All Packages', path: '/' }].filter(
        (item, idx, arr) => arr.findIndex((a) => a.path === item.path) === idx
      ),
      autoNavigatePath: directTarget.path,
    };
  }

  // Parse guest count if user asks e.g. "for 4 guests" or "6 travelers"
  const guestMatch = lower.match(/\b(\d{1,3})\s*(?:guest|guests|traveler|travelers|people|pax)\b/);
  const guestCount = guestMatch ? Math.max(1, Number(guestMatch[1])) : 2;
  const matchedPkgs = findMentionedPackages(query, packages);

  // Compare two or more destinations
  if (
    matchedPkgs.length >= 2 ||
    (matchedPkgs.length >= 1 && /\b(compare|vs|versus|difference|between)\b/i.test(lower))
  ) {
    const selected = matchedPkgs.slice(0, 3);
    const lines = selected.map((pkg) => {
      const sigTotal = pkg.basePrice * guestCount;
      const privTotal = (pkg.basePrice + pkg.privateUpgrade) * guestCount;
      return `- ${pkg.title} (${pkg.country}): ${pkg.days}D/${pkg.nights}N, max ${pkg.maxGuests} guests, best ${pkg.season}. $${pkg.basePrice.toLocaleString()}/guest — for ${guestCount} guests: $${sigTotal.toLocaleString()} Signature or $${privTotal.toLocaleString()} Private tier.`;
    });

    return {
      text: `Here is how they compare for ${guestCount} ${
        guestCount === 1 ? 'guest' : 'guests'
      }:\n${lines.join('\n')}`,
      actions: selected.map((p) => ({
        label: `Open ${p.title}`,
        path: `/packages/${p.slug}`,
      })),
    };
  }

  // Single package details / pricing
  if (matchedPkgs.length === 1) {
    const pkg = matchedPkgs[0];
    const sigTotal = pkg.basePrice * guestCount;
    const privTotal = (pkg.basePrice + pkg.privateUpgrade) * guestCount;
    return {
      text: `${pkg.title} (${pkg.location}, ${pkg.country}) is a ${pkg.days}-day / ${pkg.nights}-night itinerary best visited ${pkg.season}. ${pkg.summary}\nSignature rate is $${pkg.basePrice.toLocaleString()}/guest ($${sigTotal.toLocaleString()} for ${guestCount}) and Private Suite tier is $${privTotal.toLocaleString()} total.`,
      actions: [
        { label: `Open ${pkg.title}`, path: `/packages/${pkg.slug}` },
        { label: `Browse ${pkg.region}`, path: `/destinations/${regionSlug(pkg.region)}` },
      ],
    };
  }

  // Cancel trip / My Trips / Sign in
  if (/\b(cancel|refund|my trip|my booking|sign in|login|log in)\b/i.test(lower)) {
    return {
      text: `To view or cancel an existing reservation, open Home Login & My Trips and sign in with the email used on your booking. Inside your Active Reservations list, click Cancel Trip on any confirmed trip.`,
      actions: [
        { label: userRole ? 'My Trips & Account' : 'Home Login & My Trips', path: '/home' },
        { label: 'All Packages', path: '/' },
      ],
    };
  }

  // Owner business / studio help
  if (/\b(owner|profit|p&l|margin|expense|loss|add destination|studio|photo)\b/i.test(lower)) {
    return {
      text:
        userRole === 'owner'
          ? `Open your Owner Console to inspect real-time Gross Earnings, Supplier Costs, Operating Expenses, Cancellation Losses, Net Profit, and use Destinations Studio to publish new trips with per-day location photos.`
          : `The Owner Console (Financial P&L Ledger and Destinations Studio) is available after signing in via Owner Login on the Home Login page.`,
      actions: [
        userRole === 'owner'
          ? { label: 'Open Owner Console', path: '/owner' }
          : { label: 'Go to Owner Sign In', path: '/home' },
        { label: 'All Packages', path: '/' },
      ],
    };
  }

  // Group / Corporate proposal
  if (/\b(group|corporate|offsite|buyout|team|company|proposal|quote)\b/i.test(lower)) {
    return {
      text: `For custom dates, private buyouts, or groups of 6 to 24+ guests, submit our Group Proposal form for single-invoice corporate billing and custom aviation or villa holds.`,
      actions: [
        { label: 'Request Group Proposal', path: '/inquire' },
        { label: 'All Packages', path: '/' },
      ],
    };
  }

  // Winter / Northern Lights / Aurora
  if (/\b(winter|aurora|northern lights|snow|glacier|cold|december|january|february)\b/i.test(lower)) {
    const winterPicks = packages.filter(
      (p) =>
        /sep|oct|nov|dec|jan|feb|mar|year/i.test(p.season) ||
        /iceland|swiss|alps|nordic/i.test(`${p.title} ${p.region} ${p.summary}`)
    );
    const list = (winterPicks.length > 0 ? winterPicks : packages.slice(0, 2)).slice(0, 3);
    return {
      text: `Top winter and snow departures:\n${list
        .map(
          (p) =>
            `- ${p.title} (${p.country}): ${p.days}D/${p.nights}N, $${p.basePrice.toLocaleString()}/guest, best ${p.season}.`
        )
        .join('\n')}`,
      actions: list.map((p) => ({
        label: `Open ${p.title}`,
        path: `/packages/${p.slug}`,
      })),
    };
  }

  // Budget / Cheapest / Shortest
  if (/\b(cheap|cheapest|lowest|budget|affordable|best value|shortest)\b/i.test(lower)) {
    const sorted = [...packages].sort((a, b) => a.basePrice - b.basePrice).slice(0, 3);
    return {
      text: `Most accessible curated packages by base rate:\n${sorted
        .map(
          (p) =>
            `- ${p.title} (${p.country}): $${p.basePrice.toLocaleString()}/guest for ${p.days} Days.`
        )
        .join('\n')}`,
      actions: sorted.map((p) => ({
        label: `Open ${p.title}`,
        path: `/packages/${p.slug}`,
      })),
    };
  }

  // Regional filter question
  const regions = Array.from(new Set(packages.map((p) => p.region)));
  const matchedRegion = regions.find((r) => lower.includes(r.toLowerCase()));
  if (matchedRegion) {
    const regPkgs = packages.filter((p) => p.region === matchedRegion);
    return {
      text: `In ${matchedRegion}, we currently offer ${regPkgs.length} curated ${
        regPkgs.length === 1 ? 'itinerary' : 'itineraries'
      }:\n${regPkgs
        .map(
          (p) =>
            `- ${p.title} (${p.country}): ${p.days}D/${p.nights}N from $${p.basePrice.toLocaleString()}/guest.`
        )
        .join('\n')}`,
      actions: [
        { label: `Browse ${matchedRegion}`, path: `/destinations/${regionSlug(matchedRegion)}` },
        ...regPkgs.slice(0, 2).map((p) => ({
          label: `Open ${p.title}`,
          path: `/packages/${p.slug}`,
        })),
      ].slice(0, 3),
    };
  }

  // General navigation / catalog guide
  const highlights = packages.slice(0, 3);
  return {
    text: `I can help you compare any package, calculate totals for your group size, or take you straight to any page:\n- All ${packages.length} Destinations: ${packages
      .map((p) => `${p.title} ($${p.basePrice.toLocaleString()})`)
      .join(', ')}\n- Say "Take me to Santorini", "Open My Trips", or tap any shortcut below.`,
    actions: [
      { label: `Open ${highlights[0]?.title || 'Packages'}`, path: highlights[0] ? `/packages/${highlights[0].slug}` : '/' },
      { label: 'Home Login & My Trips', path: '/home' },
      { label: 'Group Proposal', path: '/inquire' },
    ],
  };
}

export function GeminiChatbot({
  userRole,
  token,
  mode,
  onModeChange,
  packages,
  onNavigate,
}: {
  userRole: 'customer' | 'owner' | null;
  token: string | null;
  mode: ChatPanelMode;
  onModeChange: (next: ChatPanelMode) => void;
  packages: TravelPackage[];
  onNavigate: (path: string) => void;
}) {
  const [speedMode, setSpeedMode] = useState<'fast' | 'balanced'>('fast');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const initialGreeting = useMemo(
    () =>
      userRole === 'owner'
        ? 'Hello Siddharth. Ask me for margin breakdowns, top-performing routes, or ask me to open any page like Owner Console or Destinations.'
        : 'Welcome to Meridian Voyages. Ask me to compare destinations, calculate totals for any group size, or say "take me to Santorini / My Trips / Group Quote" to navigate.',
    [userRole]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: initialGreeting },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'model') {
        return [{ role: 'model', text: initialGreeting }];
      }
      return prev;
    });
  }, [initialGreeting]);

  useEffect(() => {
    if (scrollRef.current && mode === 'open') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, mode, loading]);

  const handleActionClick = (path: string) => {
    onNavigate(path);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      onModeChange('minimized');
    }
  };

  const postChat = async (
    payloadMessages: { role: 'user' | 'model'; text: string }[],
    requestedSpeed: 'fast' | 'balanced'
  ): Promise<{ reply: string } | { unavailable: true }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          speedMode: requestedSpeed,
        }),
      });

      const rawText = await res.text();
      let json: { reply?: string; error?: string } | null = null;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }

      if (!res.ok || !json || typeof json.reply !== 'string' || !json.reply.trim()) {
        return { unavailable: true };
      }

      return { reply: sanitizeReplyText(json.reply) };
    } catch {
      return { unavailable: true };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput('');

    // Instant client-side website navigation when user gives an explicit "go to / open / take me to" command
    const directTarget = detectDirectNavigationTarget(text, packages, userRole);
    if (directTarget) {
      onNavigate(directTarget.path);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Opening ${directTarget.label}.`,
          actions: [directTarget, { label: 'All Packages', path: '/' }].filter(
            (item, idx, arr) => arr.findIndex((a) => a.path === item.path) === idx
          ),
        },
      ]);
      return;
    }

    // Exclude the client-side greeting before sending conversation turns to the backend
    const conversationPayload = nextMessages
      .filter((m, idx) => !(idx === 0 && m.role === 'model'))
      .map((m) => ({ role: m.role, text: m.text }));

    setLoading(true);

    try {
      let result = await postChat(conversationPayload, speedMode);
      if ('unavailable' in result && speedMode === 'balanced') {
        result = await postChat(conversationPayload, 'fast');
      }

      if ('reply' in result) {
        const actions = extractNavigationActions(
          `${text}\n${result.reply}`,
          packages,
          userRole
        );
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: result.reply, actions },
        ]);
      } else {
        const fallback = buildLocalConciergeReply(text, packages, userRole);
        if (fallback.autoNavigatePath) {
          onNavigate(fallback.autoNavigatePath);
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: fallback.text,
            actions: fallback.actions,
          },
        ]);
      }
    } catch {
      const safeFallback = buildLocalConciergeReply(text, packages, userRole);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: safeFallback.text,
          actions: safeFallback.actions,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts =
    userRole === 'owner'
      ? [
          'Which package has the highest profit margin?',
          'Take me to Owner Console',
        ]
      : [
          'Compare Santorini vs. Amalfi Coast for 4 guests',
          'Best winter package for Northern Lights?',
        ];

  const navShortcuts: ChatAction[] = useMemo(() => {
    const base: ChatAction[] = [
      { label: 'All Packages', path: '/' },
      { label: userRole ? 'My Trips' : 'Sign In', path: '/home' },
      { label: 'Group Quote', path: '/inquire' },
    ];
    if (userRole === 'owner') {
      base.push({ label: 'Owner Console', path: '/owner' });
    }
    return base;
  }, [userRole]);

  useEffect(() => {
    if (mode !== 'open') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onModeChange('minimized');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onModeChange]);

  if (mode === 'closed') {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 sm:bottom-4 sm:right-4">
      {mode === 'open' ? (
        <div
          role="dialog"
          aria-label="Travel Concierge Chat"
          className="flex h-[min(510px,calc(100dvh-5rem))] w-[min(calc(100vw-1.5rem),400px)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950/92 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 bg-slate-950/85 px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg font-semibold text-white">
                {userRole === 'owner' ? 'Executive Advisor' : 'Travel Concierge'}
              </h2>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-300">
                <button
                  type="button"
                  onClick={() =>
                    setSpeedMode((m) => (m === 'fast' ? 'balanced' : 'fast'))
                  }
                  className="transition-colors hover:text-amber-200"
                >
                  {speedMode === 'fast' ? 'Instant Reply · Switch' : 'Detailed Advice · Switch'}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setMessages([{ role: 'model', text: initialGreeting }])}
                  className="inline-flex items-center gap-1 transition-colors hover:text-amber-200"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label="Minimize chat"
                title="Minimize chat"
                onClick={() => onModeChange('minimized')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Close chat"
                title="Close chat completely"
                onClick={() => onModeChange('closed')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-rose-500/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Website Navigation Strip */}
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/12 bg-slate-950/75 px-3 py-2">
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <Compass className="h-3 w-3 text-amber-200" aria-hidden="true" />
              Go to
            </span>
            {navShortcuts.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => handleActionClick(item.path)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-100 transition-colors hover:border-amber-200/60 hover:bg-white/15 hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Scrollable Conversation Thread */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white font-medium text-slate-950 shadow-sm'
                      : 'border border-white/15 bg-slate-900/90 text-slate-100'
                  }`}
                >
                  {m.text}
                </div>

                {m.role === 'model' && m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex max-w-[88%] flex-wrap gap-1.5">
                    {m.actions.map((act) => (
                      <button
                        key={act.path}
                        type="button"
                        onClick={() => handleActionClick(act.path)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300/40 bg-amber-300/15 px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-200 hover:bg-amber-300/25 hover:text-white"
                      >
                        <span>{act.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
                  Drafting reply...
                </div>
              </div>
            )}
          </div>

          {/* Starter Prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-white/12 bg-slate-950/75 px-4 py-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-white/20 bg-slate-900/80 px-2.5 py-1 text-left text-[11px] text-slate-200 transition-colors hover:border-amber-300/60 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-white/15 bg-slate-950/88 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about trips, prices, or say 'take me to...' "
              aria-label="Chat message"
              className="flex-1 rounded-xl border border-white/20 bg-slate-900/90 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="inline-flex items-center overflow-hidden rounded-2xl border border-white/20 bg-slate-950/88 shadow-xl backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5 hover:border-amber-200/50">
          <button
            type="button"
            onClick={() => onModeChange('open')}
            className="inline-flex items-center gap-2 py-3 pl-4 pr-2.5 text-xs font-semibold text-white"
          >
            <MessageSquare className="h-4 w-4 text-amber-200" aria-hidden="true" />
            <span>{userRole === 'owner' ? 'Business Advisor' : 'Travel Chat'}</span>
          </button>
          <button
            type="button"
            aria-label="Close chat completely"
            title="Close chat"
            onClick={() => onModeChange('closed')}
            className="border-l border-white/15 px-2.5 py-3 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
