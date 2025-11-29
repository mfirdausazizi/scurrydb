'use client';

import { Turnstile as TurnstileWidget, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useTheme } from 'next-themes';
import * as React from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export function Turnstile({ onVerify, onError, onExpire }: TurnstileProps) {
  const { resolvedTheme } = useTheme();
  const [siteKey, setSiteKey] = React.useState<string | null>(null);
  const ref = React.useRef<TurnstileInstance>(null);

  React.useEffect(() => {
    // Get site key from environment (exposed via Next.js public env)
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (key) {
      setSiteKey(key);
    }
  }, []);

  // Don't render if no site key configured
  if (!siteKey) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <TurnstileWidget
        ref={ref}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}

export function useTurnstile() {
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onVerify = React.useCallback((newToken: string) => {
    setToken(newToken);
    setError(null);
  }, []);

  const onError = React.useCallback(() => {
    setToken(null);
    setError('Verification failed. Please try again.');
  }, []);

  const onExpire = React.useCallback(() => {
    setToken(null);
    setError('Verification expired. Please verify again.');
  }, []);

  const reset = React.useCallback(() => {
    setToken(null);
    setError(null);
  }, []);

  return {
    token,
    error,
    onVerify,
    onError,
    onExpire,
    reset,
    isVerified: !!token,
  };
}
