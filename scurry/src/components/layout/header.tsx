'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenu } from './user-menu';
import { TeamSwitcher } from '@/components/teams';
import { ConnectionSwitcher } from '@/components/connections';
import { useWorkspaceSync } from '@/hooks';

interface HeaderProps {
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
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
              <ConnectionSwitcher className="w-full" autoNavigate onSelect={() => setMobileMenuOpen(false)} />
            </div>
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
        <span className="font-semibold text-lg hidden sm:inline-block">ScurryDB</span>
      </Link>

      {/* Desktop Switchers */}
      <div className="hidden md:flex items-center gap-2">
        <TeamSwitcher className="w-[180px] lg:w-[200px]" />
        <ConnectionSwitcher className="w-[180px] lg:w-[200px]" autoNavigate />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      <UserMenu />
    </header>
  );
}
