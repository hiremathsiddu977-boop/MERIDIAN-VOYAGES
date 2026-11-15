import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Minus, Send, Trash2, X } from 'lucide-react';

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
  const [speedMode, setSpeedMode] = useState<'balanced' | 'fast'>('balanced');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initialGreeting =
    userRole === 'owner'
      ? 'Hello Siddharth. Ask me for margin breakdowns, top-performing routes, or ways to reduce cancellation losses.'
      : 'Welcome to Meridian Voyages. Ask me to compare Santorini, Kyoto, the Swiss Alps, Bali, Iceland, or Amalfi Coast packages.';

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: initialGreeting },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && mode === 'open') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, mode, loading]);

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const nextThread: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextThread);
    if (!textOverride) setInput('');
    setError('');
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: nextThread,
          speedMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to send message.');

      setMessages((prev) => [...prev, { role: 'model', text: json.reply }]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect to travel assistant.'
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
    <div className="fixed bottom-4 right-4 z-50">
      {mode === 'open' ? (
        <div
          role="dialog"
          aria-label="Travel Concierge Chat"
          className="glass-panel flex h-[min(460px,calc(100vh-2rem))] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-3xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg font-semibold text-white">
                {userRole === 'owner' ? 'Executive Advisor' : 'Travel Concierge'}
              </h2>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-300">
                <button
                  type="button"
                  onClick={() =>
                    setSpeedMode((m) => (m === 'balanced' ? 'fast' : 'balanced'))
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
                  className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white text-slate-950 font-medium'
                      : 'border border-white/12 bg-slate-950/60 text-slate-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/12 bg-slate-950/60 px-3.5 py-2 text-xs text-slate-300">
                  Drafting reply...
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs font-medium text-rose-300 px-1">
                {error}
              </p>
            )}
          </div>

          {/* Starter Prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-4 py-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-white/15 bg-slate-950/50 px-2.5 py-1 text-[11px] text-slate-200 transition-colors hover:border-amber-300/60 hover:text-white"
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
            className="flex items-center gap-2 border-t border-white/12 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about destinations, pricing, or profit..."
              aria-label="Chat message"
              className="flex-1 rounded-xl border border-white/20 bg-slate-950/65 px-3.5 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none"
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
        <div className="glass-panel inline-flex items-center overflow-hidden rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 hover:border-amber-200/50">
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
