'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, FileCode, Bookmark, Search, Settings, Bot, Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from './theme-toggle';
import { TeamSwitcher } from '@/components/teams';
import { ConnectionSwitcher } from '@/components/connections';

interface HeaderProps {
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

const navItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Query Editor',
    url: '/query',
    icon: FileCode,
  },
  {
    title: 'Saved Queries',
    url: '/queries',
    icon: Bookmark,
  },
  {
    title: 'Browse',
    url: '/browse',
    icon: Search,
  },
];

export function Header({ breadcrumbs = [] }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
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
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">🐿️</span>
              <span>ScurryDB</span>
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team
              </label>
              <TeamSwitcher className="w-full" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Connection
              </label>
              <ConnectionSwitcher className="w-full" />
            </div>
            <Separator />
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
                return (
                  <Button
                    key={item.url}
                    variant={isActive ? "secondary" : "ghost"}
                    asChild
                    className="justify-start h-11 gap-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>
            <Separator />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                asChild
                className="justify-start h-11 gap-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/settings">
                  <Bot className="h-5 w-5" />
                  <span>AI Settings</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                asChild
                className="justify-start h-11 gap-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/connections">
                  <Settings className="h-5 w-5" />
                  <span>Manage Connections</span>
                </Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <span className="text-xl transition-transform group-hover:scale-110">🐿️</span>
        <span className="font-semibold text-lg hidden sm:inline-block">ScurryDB</span>
      </Link>

      {/* Desktop Switchers */}
      <div className="hidden md:flex items-center gap-2">
        <TeamSwitcher className="w-[180px] lg:w-[200px]" />
        <ConnectionSwitcher className="w-[180px] lg:w-[200px]" />
      </div>

      <Separator orientation="vertical" className="mx-2 h-4 hidden md:block" />

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1 flex-1 overflow-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
          return (
            <Button
              key={item.url}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              asChild
              className="h-8 gap-2"
            >
              <Link href={item.url}>
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline-block">{item.title}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Mobile Navigation - Icons Only */}
      <nav className="flex md:hidden items-center gap-0.5 flex-1 overflow-auto justify-end">
        {navItems.slice(0, 3).map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
          return (
            <Button
              key={item.url}
              variant={isActive ? "secondary" : "ghost"}
              size="icon"
              asChild
              className="h-9 w-9"
            >
              <Link href={item.url}>
                <item.icon className="h-4 w-4" />
                <span className="sr-only">{item.title}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Desktop Action Buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="AI Settings">
          <Link href="/settings">
            <Bot className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Manage Connections">
          <Link href="/connections">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out"
          className="h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Action Buttons */}
      <div className="flex md:hidden items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out"
          className="h-9 w-9"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
