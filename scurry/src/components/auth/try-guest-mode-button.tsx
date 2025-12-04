'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuestModeStore } from '@/lib/store/guest-mode-store';
import { generateGuestId, isEncryptionSupported } from '@/lib/utils/client-encryption';

interface TryGuestModeButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function TryGuestModeButton({ 
  variant = 'outline', 
  size = 'lg',
  className 
}: TryGuestModeButtonProps) {
  const router = useRouter();
  const enterGuestMode = useGuestModeStore((state) => state.enterGuestMode);
  const [loading, setLoading] = React.useState(false);

  const handleTryGuestMode = async () => {
    if (!isEncryptionSupported()) {
      alert('Your browser does not support the required encryption features for guest mode.');
      return;
    }

    setLoading(true);
    try {
      const guestId = await generateGuestId();
      enterGuestMode(guestId);
      router.push('/guest/dashboard');
    } catch (error) {
      console.error('Failed to enter guest mode:', error);
      alert('Failed to start guest mode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleTryGuestMode}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Play className="mr-2 h-5 w-5" />
      )}
      Try Without Account
    </Button>
  );
}
