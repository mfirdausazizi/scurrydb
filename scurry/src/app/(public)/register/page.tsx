import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { RegisterForm } from '@/components/auth/register-form';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🐿️</span>
            <span className="font-bold text-xl">ScurryDB</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      
      {/* Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <RegisterForm />
      </main>
    </div>
  );
}
