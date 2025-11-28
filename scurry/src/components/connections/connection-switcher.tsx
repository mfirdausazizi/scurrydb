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
import { useConnections } from '@/hooks';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface ConnectionSwitcherProps {
    className?: string;
}

export function ConnectionSwitcher({ className }: ConnectionSwitcherProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentConnectionId = searchParams.get('connection');
    const { activeTeamId } = useWorkspaceStore();
    const { connections, loading } = useConnections({ teamId: activeTeamId });

    const activeConnection = connections.find(c => c.id === currentConnectionId);

    const handleSelectConnection = (connectionId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('connection', connectionId);
        if (activeTeamId) {
            params.set('teamId', activeTeamId);
        }
        router.push(`/browse?${params.toString()}`);
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
                <DropdownMenuLabel>Connections</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {loading ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : connections.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No connections found</div>
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
                    <Link href="/connections">
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Add Connection</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/connections">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Manage Connections</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
