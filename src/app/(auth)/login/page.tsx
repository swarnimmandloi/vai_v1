'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/projects');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/projects');
      }
    }

    setLoading(false);
  }

  const inputStyle = {
    background: 'var(--background)',
    borderColor: 'var(--border)',
    color: 'var(--foreground)',
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm p-8 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold mb-6" style={{ background: 'var(--accent)' }}>
          V
        </div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          {mode === 'signin' ? 'Sign in to VAI' : 'Create your account'}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>
          {mode === 'signin' ? 'Enter your email and password' : 'Pick an email and password'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
          />

          {error && (
            <p className="text-xs" style={{ color: '#e53e3e' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--muted-fg)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            className="underline"
            style={{ color: 'var(--accent)' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
