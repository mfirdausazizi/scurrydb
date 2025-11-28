import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Header } from '@/components/layout';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentUser } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
