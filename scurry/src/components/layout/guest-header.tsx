'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, SquareTerminal, Database, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { GuestConnectionSwitcher } from '@/components/connections/guest-connection-switcher';
import { ThemeToggle } from './theme-toggle';
import { useGuestModeStore } from '@/lib/store/guest-mode-store';
import { useGuestConnectionsStore } from '@/lib/store/guest-connections-store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/guest/browse', label: 'Schema Browser', icon: Database },
  { href: '/guest/query', label: 'Query Editor', icon: SquareTerminal },
];

export function GuestHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const exitGuestMode = useGuestModeStore((state) => state.exitGuestMode);
  const clearConnections = useGuestConnectionsStore((state) => state.clearAllConnections);

  const handleExitGuestMode = () => {
    exitGuestMode();
    clearConnections();
    router.push('/');
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9 touch-target">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>
                <Link
                  href="/guest/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 group"
                >
                  <span className="text-xl transition-transform group-hover:scale-110">🐿️</span>
                  <span>ScurryDB</span>
                  <Badge variant="secondary" className="text-xs">Guest</Badge>
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Connection
                </label>
                <GuestConnectionSwitcher 
                  className="w-full" 
                  autoNavigate 
                  onSelect={() => setMobileMenuOpen(false)} 
                />
              </div>
              <Separator />
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <Separator />
              <div className="space-y-2">
                <Button asChild variant="default" size="sm" className="w-full">
                  <Link href="/register">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/guest/dashboard" className="flex items-center gap-2 group">
          <span className="text-xl transition-transform group-hover:scale-110">🐿️</span>
          <span className="font-semibold text-lg">ScurryDB</span>
        </Link>

        {/* Guest Mode Badge */}
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
          Guest Mode
        </Badge>

        {/* Desktop Connection Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <GuestConnectionSwitcher className="w-[180px] lg:w-[200px]" autoNavigate />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          <TooltipProvider>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn(
                          'h-9 gap-2',
                          isActive && 'bg-muted font-medium'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden xl:inline">{item.label}</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="xl:hidden">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Guest Mode Banner */}
      <div className="border-b bg-amber-500/10 px-3 py-1.5 md:px-4 md:py-2">
        <div className="container mx-auto flex items-center gap-2 text-xs md:text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex flex-wrap items-center gap-x-1">
            <span className="hidden sm:inline">You&apos;re in guest mode. Your data is stored locally in your browser.</span>
            <span className="sm:hidden">Guest mode.</span>
            <Link href="/register" className="font-medium underline hover:no-underline">
              <span className="hidden sm:inline">Create an account</span>
              <span className="sm:hidden">Sign up</span>
            </Link>
            <span className="hidden sm:inline">to sync across devices and access team features.</span>
            <span className="sm:hidden">to save your data.</span>
          </p>
        </div>
      </div>
    </>
  );
}
