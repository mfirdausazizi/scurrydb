'use client';

import * as React from 'react';
import { ChevronsUpDown, Database, Plus, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGuestConnectionsStore } from '@/lib/store/guest-connections-store';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface GuestConnectionSwitcherProps {
    className?: string;
    /** When true, selecting a connection auto-navigates to /guest/browse */
    autoNavigate?: boolean;
    /** Callback when a connection is selected */
    onSelect?: () => void;
}

export function GuestConnectionSwitcher({ className, autoNavigate = false, onSelect }: GuestConnectionSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentConnectionId = searchParams.get('connection');
    
    const connections = useGuestConnectionsStore((state) => state.connections);
    const setActiveConnection = useGuestConnectionsStore((state) => state.setActiveConnection);

    const activeConnection = connections.find(c => c.id === currentConnectionId);

    const handleSelectConnection = (connectionId: string) => {
        setActiveConnection(connectionId);
        
        const params = new URLSearchParams();
        params.set('connection', connectionId);
        
        // If autoNavigate is enabled, always go to /guest/browse
        // Otherwise, stay on current page if it supports connections
        if (autoNavigate) {
            router.push(`/guest/browse?${params.toString()}`);
        } else {
            // For pages that support connection params, update the URL
            const connectionPages = ['/guest/browse', '/guest/query'];
            if (connectionPages.some(p => pathname.startsWith(p))) {
                router.push(`${pathname}?${params.toString()}`);
            } else {
                router.push(`/guest/browse?${params.toString()}`);
            }
        }
        
        onSelect?.();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={`w-[200px] justify-between ${className}`}>
                    <div className="flex items-center gap-2 truncate">
                        <Database className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                            {activeConnection ? activeConnection.name : 'Select Connection'}
                        </span>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]" align="start">
                <DropdownMenuLabel>Connections (Local)</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {connections.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No connections yet</div>
                ) : (
                    connections.map((connection) => (
                        <DropdownMenuItem key={connection.id} onClick={() => handleSelectConnection(connection.id)}>
                            <div
                                className="mr-2 h-2 w-2 rounded-full"
                                style={{ backgroundColor: connection.color || '#8B5A2B' }}
                            />
                            <span className="truncate">{connection.name}</span>
                            {currentConnectionId === connection.id && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                    ))
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href="/guest/connections">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add Connection</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/guest/connections">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Manage Connections</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
