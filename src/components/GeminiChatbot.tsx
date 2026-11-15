import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Minus, RotateCcw, Send, Trash2, X } from 'lucide-react';

export type ChatPanelMode = 'open' | 'minimized' | 'closed';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function GeminiChatbot({
  userRole,
  token,
  mode,
  onModeChange,
}: {
  userRole: 'customer' | 'owner' | null;
  token: string | null;
  mode: ChatPanelMode;
  onModeChange: (next: ChatPanelMode) => void;
}) {
  const [speedMode, setSpeedMode] = useState<'fast' | 'balanced'>('fast');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const initialGreeting =
    userRole === 'owner'
      ? 'Hello Siddharth. Ask me for margin breakdowns, top-performing routes, or ways to reduce cancellation losses.'
      : 'Welcome to Meridian Voyages. Ask me to compare Santorini, Kyoto, the Swiss Alps, Bali, Iceland, Amalfi Coast, or any custom destination.';

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
  }, [messages, mode, loading, error]);

  const postChat = async (
    payloadMessages: ChatMessage[],
    requestedSpeed: 'fast' | 'balanced'
  ): Promise<string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
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

    if (!res.ok || !json || typeof json.reply !== 'string') {
      const serverErr =
        json?.error ||
        (res.status >= 500
          ? 'The concierge service timed out. Please retry.'
          : 'Unable to complete your request.');
      throw new Error(serverErr);
    }

    return json.reply;
  };

  const sendMessage = async (textOverride?: string, isRetry = false) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const baseMessages = isRetry ? messages : [...messages, { role: 'user' as const, text }];
    if (!isRetry) {
      setMessages(baseMessages);
      setInput('');
    }

    // Exclude the client-side greeting before sending conversation turns to the backend
    const conversationPayload = baseMessages.filter(
      (m, idx) => !(idx === 0 && m.role === 'model')
    );

    setError('');
    setLastFailedText(null);
    setLoading(true);

    try {
      let reply: string;
      try {
        reply = await postChat(conversationPayload, speedMode);
      } catch {
        // Automatic single fast retry if the first call hit a transient proxy or gateway hiccup
        await new Promise((r) => setTimeout(r, 350));
        reply = await postChat(conversationPayload, 'fast');
      }

      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err: unknown) {
      setLastFailedText(text);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to travel concierge. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts =
    userRole === 'owner'
      ? [
          'Which package has the highest profit margin?',
          'Summarize my current earnings vs. losses.',
        ]
      : [
          'Compare Santorini vs. Amalfi Coast for 4 guests',
          'Best winter package for Northern Lights?',
        ];

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
          className="flex h-[min(480px,calc(100dvh-5.25rem))] w-[min(calc(100vw-1.5rem),390px)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950/92 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.88)] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 bg-slate-950/80 px-4 py-3">
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
                  className="hover:text-amber-200 transition-colors"
                >
                  {speedMode === 'fast' ? 'Instant Reply · Switch' : 'Detailed Advice · Switch'}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([{ role: 'model', text: initialGreeting }]);
                    setError('');
                    setLastFailedText(null);
                  }}
                  className="inline-flex items-center gap-1 hover:text-amber-200 transition-colors"
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

          {/* Scrollable Conversation Thread */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white text-slate-950 font-medium shadow-sm'
                      : 'border border-white/15 bg-slate-900/90 text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/15 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300">
                  Drafting reply...
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-2 rounded-xl border border-rose-400/30 bg-rose-950/60 px-3 py-2 text-xs text-rose-200"
              >
                <span>{error}</span>
                {lastFailedText && (
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedText, true)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 font-semibold text-white hover:bg-white/25"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Starter Prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-white/12 bg-slate-950/70 px-4 py-2">
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
            className="flex items-center gap-2 border-t border-white/15 bg-slate-950/85 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about destinations, pricing, or profit..."
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
