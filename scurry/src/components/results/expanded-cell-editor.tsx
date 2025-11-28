'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ExpandedCellEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  columnType?: string;
  value: string;
  onSave: (value: string) => void;
}

// Try to format JSON, return original if not valid JSON
function tryFormatJson(value: string): { formatted: string; isJson: boolean; error?: string } {
  if (!value.trim()) {
    return { formatted: value, isJson: false };
  }
  try {
    const parsed = JSON.parse(value);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch (e) {
    return { formatted: value, isJson: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}

// Check if value looks like JSON
function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

export function ExpandedCellEditor({
  open,
  onOpenChange,
  columnName,
  columnType,
  value: initialValue,
  onSave,
}: ExpandedCellEditorProps) {
  const [value, setValue] = React.useState(initialValue);
  const [isDirty, setIsDirty] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Reset value when dialog opens with new initial value
  React.useEffect(() => {
    if (open) {
      // If it looks like JSON, try to format it nicely
      if (looksLikeJson(initialValue)) {
        const { formatted } = tryFormatJson(initialValue);
        setValue(formatted);
      } else {
        setValue(initialValue);
      }
      setIsDirty(false);
    }
  }, [open, initialValue]);

  // Focus textarea when dialog opens
  React.useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 0);
    }
  }, [open]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setIsDirty(true);
  };

  const handleFormat = () => {
    const { formatted, isJson } = tryFormatJson(value);
    if (isJson) {
      setValue(formatted);
      setIsDirty(true);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed));
      setIsDirty(true);
    } catch {
      // Not valid JSON, do nothing
    }
  };

  const handleSave = () => {
    // If JSON was formatted, minify before saving to match original storage format
    let saveValue = value;
    if (looksLikeJson(value)) {
      try {
        const parsed = JSON.parse(value);
        saveValue = JSON.stringify(parsed);
      } catch {
        // Keep as-is if not valid JSON
      }
    }
    onSave(saveValue);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const { isJson, error: jsonError } = tryFormatJson(value);
  const showJsonControls = looksLikeJson(value) || (columnType?.toLowerCase().includes('json'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{columnName}</span>
            {columnType && (
              <Badge variant="secondary" className="text-xs font-normal">
                {columnType}
              </Badge>
            )}
            {showJsonControls && (
              <Badge 
                variant={isJson ? 'default' : 'destructive'} 
                className="text-xs"
              >
                {isJson ? 'Valid JSON' : 'Invalid JSON'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edit the cell value. Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘/Ctrl + Enter</kbd> to save.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter value..."
            className={cn(
              'min-h-[200px] h-full font-mono text-sm resize-y',
              showJsonControls && !isJson && value.trim() && 'border-destructive'
            )}
          />
          {showJsonControls && jsonError && value.trim() && (
            <p className="text-xs text-destructive mt-1">{jsonError}</p>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {showJsonControls && (
            <div className="flex gap-2 mr-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFormat}
                disabled={!isJson}
              >
                Format
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMinify}
                disabled={!isJson}
              >
                Minify
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
