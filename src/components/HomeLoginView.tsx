import React, { useEffect, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowLeft, ArrowRight, Lock, LogOut, User } from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: 'customer' | 'owner';
}

interface CustomerBookingRow {
  id: number;
  reference: string;
  packageTitle: string;
  destination: string;
  departureDate: string;
  guests: number;
  tier: string;
  revenue: number;
  status: string;
}

export function HomeLoginView({
  user,
  token,
  onAuthenticated,
  onSignOut,
  onNavigatePackages,
  onOpenOwnerConsole,
}: {
  user: AuthUser | null;
  token: string | null;
  onAuthenticated: (user: AuthUser, token: string) => void;
  onSignOut: () => void;
  onNavigatePackages: () => void;
  onOpenOwnerConsole: () => void;
}) {
  const [loginMode, setLoginMode] = useState<'customer' | 'owner'>('customer');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [myBookings, setMyBookings] = useState<CustomerBookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState('');

  const handleCancelTrip = async (bookingId: number) => {
    if (!token) return;
    setCancelError('');
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/my-bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to cancel trip.');
      setMyBookings((prev) =>
        prev.map((row) =>
          row.id === bookingId ? { ...row, status: 'cancelled' } : row
        )
      );
      setConfirmCancelId(null);
    } catch (err: unknown) {
      setCancelError(
        err instanceof Error ? err.message : 'Unable to cancel trip.'
      );
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!user || !token || user.role !== 'customer') return;
    let active = true;
    setLoadingBookings(true);
    fetch('/api/my-bookings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (active && Array.isArray(json.bookings)) {
          setMyBookings(json.bookings);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingBookings(false);
      });
    return () => {
      active = false;
    };
  }, [user, token]);

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          name: customerName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to sign in.');
      onAuthenticated(json.user, json.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Google sign-in failed.');
      onAuthenticated(json.user, idToken);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google popup sign-in was cancelled or blocked.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          password: ownerPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Owner authentication failed.');
      onAuthenticated(json.user, json.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Owner login failed.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button
          type="button"
          onClick={onNavigatePackages}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white hover:text-amber-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Browse Destination Packages
        </button>

        <div className="glass-panel rounded-3xl p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-amber-200">
                {user.role === 'owner' ? 'Owner Account' : 'Customer Account'} ·{' '}
                {user.email}
              </p>
              <h1 className="font-display mt-1 text-3xl font-semibold text-white">
                Welcome back, {user.name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {user.role === 'owner' && (
                <button
                  type="button"
                  onClick={onOpenOwnerConsole}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
                >
                  Open Owner Console
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Switch Account
              </button>
            </div>
          </div>

          {user.role === 'customer' && (
            <div className="mt-8 border-t border-white/12 pt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Your Reserved Trips
                </h2>
                <button
                  type="button"
                  onClick={onNavigatePackages}
                  className="text-xs font-semibold text-amber-200 hover:text-white"
                >
                  Book Another Escape
                </button>
              </div>

              {cancelError && (
                <p role="alert" className="mt-3 text-xs font-medium text-rose-300">
                  {cancelError}
                </p>
              )}

              {loadingBookings ? (
                <div className="mt-4 h-24 rounded-2xl bg-white/10 animate-pulse" />
              ) : myBookings.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/12 bg-slate-950/40 p-6 text-sm text-slate-300">
                  No trips reserved under <span className="text-white">{user.email}</span> yet. Explore any destination package to reserve instantly.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-white/10">
                  {myBookings.map((b) => {
                    const isActive =
                      b.status === 'confirmed' || b.status === 'pending';
                    const isConfirming = confirmCancelId === b.id;
                    const isBusy = cancellingId === b.id;

                    return (
                      <div
                        key={b.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-xs font-medium text-amber-200 tabular-nums">
                            {b.reference} · {b.destination} · {b.departureDate}
                          </div>
                          <div className="mt-0.5 text-base font-semibold text-white">
                            {b.packageTitle}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-300 tabular-nums">
                            {b.guests} guests · {b.tier} tier ·{' '}
                            <span
                              className={
                                isActive
                                  ? 'font-medium text-emerald-300'
                                  : 'font-medium text-rose-300'
                              }
                            >
                              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div className="text-lg font-semibold text-white tabular-nums">
                            ${b.revenue.toLocaleString()}
                          </div>

                          {isActive && !isConfirming && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelError('');
                                setConfirmCancelId(b.id);
                              }}
                              className="rounded-lg border border-rose-300/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 hover:text-white whitespace-nowrap shrink-0"
                            >
                              Cancel Trip
                            </button>
                          )}

                          {isActive && isConfirming && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleCancelTrip(b.id)}
                                className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-60 whitespace-nowrap shrink-0"
                              >
                                {isBusy ? 'Cancelling...' : 'Confirm Cancel'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmCancelId(null)}
                                className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
                              >
                                Keep Trip
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        type="button"
        onClick={onNavigatePackages}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white hover:text-amber-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Packages
      </button>

      <div className="glass-panel rounded-3xl p-8 md:p-10">
        <p className="text-xs font-medium text-amber-200">
          Meridian Home Access
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold text-white">
          Sign in to Meridian Voyages
        </h1>
        <p className="mt-2 text-sm text-slate-200">
          Customers can sign in with any email to manage trips. Owners sign in to access financial analytics and operations.
        </p>

        {/* Segmented Customer vs Owner Selector */}
        <div
          role="tablist"
          aria-label="Account role"
          className="mt-6 grid grid-cols-2 gap-1.5 rounded-xl border border-white/15 bg-slate-950/55 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'customer'}
            onClick={() => {
              setLoginMode('customer');
              setError('');
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
              loginMode === 'customer'
                ? 'bg-white text-slate-950'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Customer Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === 'owner'}
            onClick={() => {
              setLoginMode('owner');
              setError('');
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
              loginMode === 'owner'
                ? 'bg-white text-slate-950'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Owner Login
          </button>
        </div>

        {loginMode === 'customer' ? (
          <div className="mt-6 space-y-5">
            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="cust-email"
                  className="block text-xs font-medium text-slate-200"
                >
                  Customer Email
                </label>
                <input
                  id="cust-email"
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="elena@northstar.co"
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-name"
                  className="block text-xs font-medium text-slate-200"
                >
                  Full Name (Optional)
                </label>
                <input
                  id="cust-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-amber-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Continue with Email'}
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-white/15" />
              <span className="mx-3 text-xs text-slate-300">or</span>
              <div className="flex-grow border-t border-white/15" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full rounded-xl border border-white/25 bg-slate-950/50 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              Continue with Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleOwnerLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="owner-email"
                className="block text-xs font-medium text-slate-200"
              >
                Owner Email
              </label>
              <input
                id="owner-email"
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="hiremathsiddu@gmail.com"
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="owner-pass"
                className="block text-xs font-medium text-slate-200"
              >
                Owner Password
              </label>
              <input
                id="owner-pass"
                type="password"
                required
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Enter owner passcode"
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              {loading ? 'Verifying Owner...' : 'Open Owner Console'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
