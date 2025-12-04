'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { GuestHeader } from '@/components/layout/guest-header';
import { Toaster } from '@/components/ui/sonner';
import { useGuestModeStore } from '@/lib/store/guest-mode-store';

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isGuestMode = useGuestModeStore((state) => state.isGuestMode);
  const guestId = useGuestModeStore((state) => state.guestId);

  // Redirect to home if not in guest mode
  useEffect(() => {
    if (!isGuestMode || !guestId) {
      router.push('/');
    }
  }, [isGuestMode, guestId, router]);

  // Don't render anything until we confirm guest mode is active
  if (!isGuestMode || !guestId) {
    return null;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen flex-col">
        <GuestHeader />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
