'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, SquareTerminal, Database, ArrowLeftRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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
import { UserMenu } from './user-menu';
import { TeamSwitcher } from '@/components/teams';
import { ConnectionSwitcher } from '@/components/connections';
import { useWorkspaceSync } from '@/hooks';
import { cn } from '@/lib/utils';

interface HeaderProps {
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

const NAV_ITEMS = [
  { href: '/browse', label: 'Schema Browser', icon: Database },
  { href: '/query', label: 'Query Editor', icon: SquareTerminal },
  { href: '/sync', label: 'Data Sync', icon: ArrowLeftRight },
];

export function Header({ breadcrumbs = [] }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  // Sync workspace state across stores when workspace changes
  useWorkspaceSync();

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
            <SheetTitle>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 group"
              >
                <span className="text-xl transition-transform group-hover:scale-110">🐿️</span>
                <span>ScurryDB</span>
              </Link>
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
              <ConnectionSwitcher className="w-full" autoNavigate onSelect={() => setMobileMenuOpen(false)} />
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
            <p className="text-xs text-muted-foreground">
              Select a connection above to browse your database or run queries.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <span className="text-xl transition-transform group-hover:scale-110">🐿️</span>
        <span className="font-semibold text-lg">ScurryDB</span>
      </Link>

      {/* Desktop Switchers */}
      <div className="hidden md:flex items-center gap-2">
        <TeamSwitcher className="w-[180px] lg:w-[200px]" />
        <ConnectionSwitcher className="w-[180px] lg:w-[200px]" autoNavigate />
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

      {/* User Menu */}
      <UserMenu />
    </header>
  );
}
