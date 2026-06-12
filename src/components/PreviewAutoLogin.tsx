'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Preview-only auto-login so Vercel PR deployments don't require manual sign-in.
// Credentials are dev-only and can be rotated or removed before public launch.
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? 'swarnim.mandloi@gmail.com';
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_USER_PASSWORD ?? 'Swarnim@06';

export function PreviewAutoLogin() {
  useEffect(() => {
    const isPreview =
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ||
      (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));

    if (!isPreview) return;

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth
          .signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD })
          .then(({ error }) => {
            if (error) {
              console.error('[VAI] Preview auto-login failed:', error.message);
            } else {
              window.location.href = '/projects';
            }
          });
      } else if (window.location.pathname === '/login') {
        window.location.href = '/projects';
      }
    });
  }, []);

  return null;
}
