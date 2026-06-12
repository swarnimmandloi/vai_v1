'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PreviewAutoLogin() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;

    const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    const password = process.env.NEXT_PUBLIC_DEV_USER_PASSWORD;
    if (!email || !password) return;

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInWithPassword({ email, password }).then(({ error }) => {
          if (error) {
            console.error('[VAI] Preview auto-login failed:', error.message);
          } else {
            window.location.reload();
          }
        });
      }
    });
  }, []);

  return null;
}
