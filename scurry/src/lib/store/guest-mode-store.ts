import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuestModeState {
  isGuestMode: boolean;
  guestId: string | null;
  enteredAt: string | null;
  
  // Actions
  enterGuestMode: (guestId: string) => void;
  exitGuestMode: () => void;
  isActive: () => boolean;
}

export const useGuestModeStore = create<GuestModeState>()(
  persist(
    (set, get) => ({
      isGuestMode: false,
      guestId: null,
      enteredAt: null,

      enterGuestMode: (guestId: string) => {
        set({
          isGuestMode: true,
          guestId,
          enteredAt: new Date().toISOString(),
        });
      },

      exitGuestMode: () => {
        set({
          isGuestMode: false,
          guestId: null,
          enteredAt: null,
        });
      },

      isActive: () => {
        return get().isGuestMode && get().guestId !== null;
      },
    }),
    {
      name: 'scurrydb-guest-mode',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Hook to check if guest mode is currently active
 * Can be used in components to conditionally render guest-specific UI
 */
export function useIsGuestMode(): boolean {
  return useGuestModeStore((state) => state.isGuestMode);
}

/**
 * Hook to get guest ID
 */
export function useGuestId(): string | null {
  return useGuestModeStore((state) => state.guestId);
}
