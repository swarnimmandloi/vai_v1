'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (!error) setSent(true);
    setLoading(false);
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-xl border"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold mb-6"
          style={{ background: 'var(--accent)' }}
        >
          V
        </div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          Sign in to VAI
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>
          We&apos;ll send you a magic link
        </p>

        {sent ? (
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>
            Check your email for the magic link.
          </p>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
