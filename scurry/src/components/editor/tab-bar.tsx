'use client';

import * as React from 'react';
import { Plus, X, Copy, FileX, Files, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEditorTabsStore, type EditorTab } from '@/lib/store/editor-tabs-store';

interface TabBarProps {
  onCloseUnsavedTab?: (tabId: string) => void; // Callback to show unsaved confirmation
}

interface TabItemProps {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onSelect, onClose, onContextMenu }: TabItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(tab.title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { renameTab } = useEditorTabsStore();

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(tab.title);
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (editTitle.trim()) {
      renameTab(tab.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditTitle(tab.title);
      setIsEditing(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-3 py-1.5 border-r cursor-pointer transition-colors min-w-[100px] max-w-[180px]',
        isActive
          ? 'bg-card border-b-2 border-b-primary text-foreground'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Dirty indicator */}
      {tab.isDirty && (
        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
      )}
      
      {/* Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm focus:ring-0 p-0"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 truncate text-sm font-medium">
              {tab.title}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{tab.title}</p>
            {tab.sql && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {tab.sql.slice(0, 100)}...
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )}
      
      {/* Close button */}
      <button
        onClick={handleClose}
        className={cn(
          'flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors',
          !isActive && 'opacity-0 group-hover:opacity-100'
        )}
        aria-label={`Close ${tab.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function TabBar({ onCloseUnsavedTab }: TabBarProps) {
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    switchTab,
    duplicateTab,
    closeOtherTabs,
    closeAllTabs,
  } = useEditorTabsStore();
  
  const [contextMenuTabId, setContextMenuTabId] = React.useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty && onCloseUnsavedTab) {
      onCloseUnsavedTab(tabId);
    } else {
      closeTab(tabId, true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenuTabId(tabId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleNewTab = () => {
    // Get the current tab's connection to use as default for new tab
    const activeTab = tabs.find(t => t.id === activeTabId);
    createTab(activeTab?.connectionId);
  };

  return (
    <div className="flex items-center border-b bg-muted/20">
      <ScrollArea className="flex-1">
        <div className="flex items-center">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => switchTab(tab.id)}
              onClose={() => handleTabClose(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
      
      {/* New tab button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mx-1 flex-shrink-0"
            onClick={handleNewTab}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">New Tab (Ctrl+T)</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Tab options menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-1 flex-shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleNewTab}>
            <Plus className="h-4 w-4 mr-2" />
            New Tab
          </DropdownMenuItem>
          {activeTabId && (
            <>
              <DropdownMenuItem onClick={() => duplicateTab(activeTabId)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => closeOtherTabs(activeTabId)}>
                <FileX className="h-4 w-4 mr-2" />
                Close Other Tabs
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={closeAllTabs}>
            <Files className="h-4 w-4 mr-2" />
            Close All Tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom context menu */}
      {contextMenuTabId && (
        <ContextMenu
          tabId={contextMenuTabId}
          position={contextMenuPosition}
          onClose={() => setContextMenuTabId(null)}
          onCloseTab={handleTabClose}
          onDuplicate={duplicateTab}
          onCloseOthers={closeOtherTabs}
        />
      )}
    </div>
  );
}

interface ContextMenuProps {
  tabId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onCloseTab: (tabId: string) => void;
  onDuplicate: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
}

function ContextMenu({
  tabId,
  position,
  onClose,
  onCloseTab,
  onDuplicate,
  onCloseOthers,
}: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: position.x, top: position.y }}
    >
      <button
        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={() => handleAction(() => onCloseTab(tabId))}
      >
        <X className="h-4 w-4 mr-2" />
        Close
      </button>
      <button
        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={() => handleAction(() => onDuplicate(tabId))}
      >
        <Copy className="h-4 w-4 mr-2" />
        Duplicate
      </button>
      <div className="my-1 h-px bg-muted" />
      <button
        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        onClick={() => handleAction(() => onCloseOthers(tabId))}
      >
        <FileX className="h-4 w-4 mr-2" />
        Close Others
      </button>
    </div>
  );
}
