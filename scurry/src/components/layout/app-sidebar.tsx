'use client';

import * as React from 'react';
import { Database, Plus, Settings, LayoutDashboard, Search, FileCode } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/lib/store';

const navItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Query Editor',
    url: '/query',
    icon: FileCode,
  },
  {
    title: 'Browse',
    url: '/browse',
    icon: Search,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { connections } = useConnectionStore();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Database className="h-4 w-4" />
          </div>
          <span className="font-semibold text-lg">Scurry</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Connections</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
              <Link href="/connections">
                <Plus className="h-3 w-3" />
              </Link>
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {connections.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No connections yet.
                  <br />
                  <Link href="/connections" className="text-primary hover:underline">
                    Add your first database!
                  </Link>
                </div>
              ) : (
                connections.map((connection) => (
                  <SidebarMenuItem key={connection.id}>
                    <SidebarMenuButton asChild>
                      <Link href={`/browse?connection=${connection.id}`}>
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: connection.color || '#8B5A2B' }}
                        />
                        <span>{connection.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/connections">
                <Settings className="h-4 w-4" />
                <span>Manage Connections</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
