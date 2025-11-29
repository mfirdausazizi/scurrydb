'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Database, ArrowLeftRight, Loader2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScreenSizeNotice,
  ComparisonPanel,
  ScrollLockControls,
  ViewModeToggle,
  SyncQueue,
  ResizablePanels,
  SyncConfigDialog,
} from '@/components/sync';
import { useConnections, useWorkspaceContext, useMediaQuery } from '@/hooks';
import { useSyncStore } from '@/lib/store/sync-store';

const MAX_PANELS = 4;

function SyncPageContent() {
  const { teamId, isTeamWorkspace } = useWorkspaceContext();
  const { connections, loading: connectionsLoading } = useConnections({ teamId });
  
  // Check screen size
  const isScreenTooSmall = useMediaQuery('(max-width: 1023px)');

  // Sync store state
  const panels = useSyncStore((state) => state.panels);
  const activePanelId = useSyncStore((state) => state.activePanelId);
  const viewMode = useSyncStore((state) => state.viewMode);
  const scrollLockMode = useSyncStore((state) => state.scrollLockMode);
  const syncQueue = useSyncStore((state) => state.syncQueue);
  
  // Sync store actions
  const addPanel = useSyncStore((state) => state.addPanel);
  const removePanel = useSyncStore((state) => state.removePanel);
  const updatePanel = useSyncStore((state) => state.updatePanel);
  const setActivePanel = useSyncStore((state) => state.setActivePanel);
  const setViewMode = useSyncStore((state) => state.setViewMode);
  const setScrollLockMode = useSyncStore((state) => state.setScrollLockMode);
  const toggleRowSelection = useSyncStore((state) => state.toggleRowSelection);
  const selectAllRows = useSyncStore((state) => state.selectAllRows);
  const clearPanelSelection = useSyncStore((state) => state.clearPanelSelection);
  const removeFromSyncQueue = useSyncStore((state) => state.removeFromSyncQueue);
  const clearSyncQueue = useSyncStore((state) => state.clearSyncQueue);

  // Sync dialog state
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Set initial active panel
  React.useEffect(() => {
    if (!activePanelId && panels.length > 0) {
      setActivePanel(panels[0].id);
    }
  }, [activePanelId, panels, setActivePanel]);

  // Handle table lock - when one panel selects a table, sync to others
  // Applies to both 'table' and 'row' lock modes (row lock includes table lock)
  const handleTableSelect = React.useCallback(
    (tableName: string) => {
      // Table lock applies to both 'table' and 'row' modes
      if (scrollLockMode === 'off') return;
      
      panels.forEach((panel) => {
        if (panel.tableName !== tableName && panel.connectionId) {
          updatePanel(panel.id, { tableName, selectedRowKeys: new Set() });
        }
      });
    },
    [panels, scrollLockMode, updatePanel]
  );

  // Handle opening sync dialog
  const handleOpenSyncDialog = React.useCallback(() => {
    setSyncDialogOpen(true);
  }, []);

  // Handle sync execution from dialog
  const handleExecuteSync = React.useCallback(
    async (config: { scope: 'selected' | 'table'; content: 'data' | 'structure' | 'both' }) => {
      if (panels.length < 2) return;
      
      const sourcePanel = panels[0];
      const targetPanel = panels[1];
      
      // Source must have connection and table selected
      if (!sourcePanel.connectionId || !sourcePanel.tableName) {
        toast.error('Panel 1 (source) must have a connection and table selected');
        return;
      }

      // Target must have connection selected
      if (!targetPanel.connectionId) {
        toast.error('Panel 2 (target) must have a connection selected');
        return;
      }

      // Determine target table name - use source table name if target doesn't have one selected
      const targetTableName = targetPanel.tableName || sourcePanel.tableName;

      setIsSyncing(true);
      try {
        const response = await fetch('/api/sync/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceConnectionId: sourcePanel.connectionId,
            targetConnectionId: targetPanel.connectionId,
            tableName: sourcePanel.tableName,
            targetTableName: targetTableName, // May be same as source or different
            scope: config.scope,
            content: config.content,
            selectedRowKeys: config.scope === 'selected' 
              ? Array.from(sourcePanel.selectedRowKeys) 
              : undefined,
            teamId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Sync failed');
        }

        const result = await response.json();
        const message = result.tableCreated 
          ? `Table created and ${result.rowsAffected} rows synced`
          : `Sync completed: ${result.rowsAffected} rows affected`;
        toast.success(message);
        setSyncDialogOpen(false);
      } catch (error) {
        console.error('Sync error:', error);
        toast.error(error instanceof Error ? error.message : 'Sync failed');
      } finally {
        setIsSyncing(false);
      }
    },
    [panels, teamId]
  );

  // Handle sync from queue (legacy)
  const handleSync = React.useCallback(() => {
    handleOpenSyncDialog();
  }, [handleOpenSyncDialog]);

  // Calculate if sync is possible (same DB types, source panel must have table selected)
  const canSync = React.useMemo(() => {
    const sourcePanel = panels[0];
    const targetPanel = panels[1];
    
    // Need at least 2 panels with connections
    if (!sourcePanel?.connectionId || !targetPanel?.connectionId) return false;
    
    // Source panel must have a table selected
    if (!sourcePanel.tableName) return false;
    
    // Both must be same database type
    if (sourcePanel.connectionType !== targetPanel.connectionType) return false;
    
    // If target has a table selected, it must match source table name
    // (can only sync same table or create new table)
    if (targetPanel.tableName && targetPanel.tableName !== sourcePanel.tableName) {
      return false;
    }
    
    // Cannot sync same table on same connection
    if (sourcePanel.connectionId === targetPanel.connectionId && 
        sourcePanel.tableName === targetPanel.tableName) {
      return false;
    }
    
    return true;
  }, [panels]);

  // Calculate reason for sync being blocked
  const syncBlockedReason = React.useMemo(() => {
    const sourcePanel = panels[0];
    const targetPanel = panels[1];
    
    if (!sourcePanel?.connectionId) {
      return 'Select a connection in Panel 1 (source)';
    }
    
    if (!sourcePanel?.tableName) {
      return 'Select a table in Panel 1 (source) to sync';
    }
    
    if (!targetPanel?.connectionId) {
      return 'Select a connection in Panel 2 (target)';
    }
    
    if (sourcePanel.connectionType !== targetPanel.connectionType) {
      return 'Cross-database sync is not supported. Both panels must use the same database type.';
    }
    
    // Different table check - can only sync same table or create new
    if (targetPanel.tableName && sourcePanel.tableName !== targetPanel.tableName) {
      return `Cannot sync between different tables. Select "${sourcePanel.tableName}" in Panel 2 or deselect the table to create it.`;
    }
    
    // Same table same connection check
    if (sourcePanel.connectionId === targetPanel.connectionId && 
        sourcePanel.tableName === targetPanel.tableName) {
      return 'Cannot sync a table to itself on the same connection.';
    }
    
    return undefined;
  }, [panels]);

  // Get connection IDs used by other panels (for preventing duplicate selection)
  const getUsedConnectionIds = React.useCallback(
    (currentPanelId: string) => {
      return panels
        .filter((p) => p.id !== currentPanelId && p.connectionId)
        .map((p) => p.connectionId as string);
    },
    [panels]
  );

  // Show screen size notice for small screens
  if (isScreenTooSmall) {
    return <ScreenSizeNotice />;
  }

  // Show loading state
  if (connectionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show empty state if no connections
  if (connections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Synchronizer</h1>
          <p className="text-muted-foreground">
            Compare and sync data across multiple database connections.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {isTeamWorkspace ? 'No shared connections' : 'No connections available'}
            </CardTitle>
            <CardDescription>
              {isTeamWorkspace
                ? 'Team admins can share connections in team settings.'
                : 'Add at least two database connections to start comparing data.'}
            </CardDescription>
            {!isTeamWorkspace && (
              <Link href="/connections" className="mt-4 inline-block">
                <Button>Add Connection</Button>
              </Link>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Need at least 2 connections
  if (connections.length < 2) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Synchronizer</h1>
          <p className="text-muted-foreground">
            Compare and sync data across multiple database connections.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <ArrowLeftRight className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle>Need More Connections</CardTitle>
            <CardDescription>
              You need at least 2 database connections to use the Data Synchronizer.
              Currently you have {connections.length} connection.
            </CardDescription>
            {!isTeamWorkspace && (
              <Link href="/connections" className="mt-4 inline-block">
                <Button>Add Another Connection</Button>
              </Link>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Data Synchronizer
            </h1>
            {!canSync && panels.some((p) => p.connectionId) && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Cross-DB: View Only
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Compare and sync data across multiple database connections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ScrollLockControls
            mode={scrollLockMode}
            onModeChange={setScrollLockMode}
          />
          <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={addPanel}
            disabled={panels.length >= MAX_PANELS || panels.length >= connections.length}
          >
            <Plus className="h-4 w-4" />
            Add Panel
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleOpenSyncDialog}
            disabled={!canSync}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Sync
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-4">
        {viewMode === 'tab' ? (
          /* Tab View */
          <Tabs
            value={activePanelId || panels[0]?.id}
            onValueChange={setActivePanel}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="justify-start w-full h-auto flex-wrap gap-1 bg-transparent p-0 mb-2">
              {panels.map((panel, index) => (
                <TabsTrigger
                  key={panel.id}
                  value={panel.id}
                  className="data-[state=active]:bg-muted px-4 py-2 rounded-md border"
                >
                  <span className="flex items-center gap-2">
                    <span>Panel {index + 1}</span>
                    {panel.connectionName && (
                      <Badge variant="secondary" className="text-xs">
                        {panel.connectionName}
                      </Badge>
                    )}
                    {panel.tableName && (
                      <Badge variant="outline" className="text-xs">
                        {panel.tableName}
                      </Badge>
                    )}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {panels.map((panel, index) => (
              <TabsContent
                key={panel.id}
                value={panel.id}
                className="flex-1 min-h-0 mt-0"
              >
                <ComparisonPanel
                  panel={panel}
                  panelIndex={index}
                  connections={connections}
                  usedConnectionIds={getUsedConnectionIds(panel.id)}
                  canRemove={panels.length > 2}
                  scrollLockMode={scrollLockMode}
                  onPanelUpdate={(updates) => updatePanel(panel.id, updates)}
                  onRemove={() => removePanel(panel.id)}
                  onToggleRowSelection={(rowKey) =>
                    toggleRowSelection(panel.id, rowKey)
                  }
                  onSelectAllRows={(rowKeys) =>
                    selectAllRows(panel.id, rowKeys)
                  }
                  onClearSelection={() => clearPanelSelection(panel.id)}
                  onTableSelect={handleTableSelect}
                  teamId={teamId}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          /* Split View with Resizable Panels */
          <ResizablePanels className="flex-1 min-h-0">
            {panels.map((panel, index) => (
              <ComparisonPanel
                key={panel.id}
                panel={panel}
                panelIndex={index}
                connections={connections}
                usedConnectionIds={getUsedConnectionIds(panel.id)}
                canRemove={panels.length > 2}
                scrollLockMode={scrollLockMode}
                onPanelUpdate={(updates) => updatePanel(panel.id, updates)}
                onRemove={() => removePanel(panel.id)}
                onToggleRowSelection={(rowKey) =>
                  toggleRowSelection(panel.id, rowKey)
                }
                onSelectAllRows={(rowKeys) =>
                  selectAllRows(panel.id, rowKeys)
                }
                onClearSelection={() => clearPanelSelection(panel.id)}
                onTableSelect={handleTableSelect}
                teamId={teamId}
              />
            ))}
          </ResizablePanels>
        )}

        {/* Sync Queue */}
        <SyncQueue
          items={syncQueue}
          onRemoveItem={removeFromSyncQueue}
          onClear={clearSyncQueue}
          onSync={handleSync}
          canSync={canSync}
        />
      </div>

      {/* Sync Config Dialog */}
      <SyncConfigDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        sourcePanel={panels[0] || null}
        targetPanel={panels[1] || null}
        selectedRowCount={panels[0]?.selectedRowKeys?.size || 0}
        canSync={canSync}
        blockedReason={syncBlockedReason}
        onExecute={handleExecuteSync}
        isExecuting={isSyncing}
      />
    </div>
  );
}

export default function SyncPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SyncPageContent />
    </React.Suspense>
  );
}
