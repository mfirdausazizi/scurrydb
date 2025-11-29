'use client';

import * as React from 'react';
import { Search, Filter, Plus, X, ChevronDown, ChevronUp, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ColumnFilter, FilterOperator } from '@/types';
import { FILTER_OPERATOR_LABELS } from '@/types';

// Debounce delay in milliseconds
const SEARCH_DEBOUNCE_MS = 300;
// Minimum characters required to trigger search
const MIN_SEARCH_CHARS = 3;

export interface ServerSearchParams {
  searchTerm: string;
  searchColumns: string[];
}

interface SchemaFilterProps {
  columns: string[];
  filters: ColumnFilter[];
  onFiltersChange: (filters: ColumnFilter[]) => void;
  // New props for server-side search
  onServerSearch?: (params: ServerSearchParams | null) => void;
  isSearching?: boolean;
}

const OPERATORS_WITHOUT_VALUE: FilterOperator[] = ['exists', 'not_exists'];

export function SchemaFilter({ 
  columns, 
  filters, 
  onFiltersChange,
  onServerSearch,
  isSearching = false,
}: SchemaFilterProps) {
  const [quickSearch, setQuickSearch] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [selectedColumn, setSelectedColumn] = React.useState<string>('');
  const [selectedOperator, setSelectedOperator] = React.useState<FilterOperator>('contains');
  const [filterValue, setFilterValue] = React.useState('');
  
  // State for column selector in quick search
  const [searchColumns, setSearchColumns] = React.useState<string[]>([]);
  const [columnSelectorOpen, setColumnSelectorOpen] = React.useState(false);
  const [columnFilterText, setColumnFilterText] = React.useState('');
  
  // Debounce timer ref
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Filter columns based on search text
  const filteredColumnsList = React.useMemo(() => {
    if (!columnFilterText.trim()) return columns;
    const searchLower = columnFilterText.toLowerCase();
    return columns.filter(col => col.toLowerCase().includes(searchLower));
  }, [columns, columnFilterText]);
  
  // Reset column filter when popover closes
  React.useEffect(() => {
    if (!columnSelectorOpen) {
      setColumnFilterText('');
    }
  }, [columnSelectorOpen]);

  // Handle server-side search with debouncing
  const triggerServerSearch = React.useCallback((searchTerm: string, cols: string[]) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // If search is cleared or too short, notify parent immediately
    if (!searchTerm.trim() || searchTerm.trim().length < MIN_SEARCH_CHARS) {
      onServerSearch?.(null);
      return;
    }
    
    // If no columns selected, don't search
    if (cols.length === 0) {
      return;
    }
    
    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      onServerSearch?.({
        searchTerm: searchTerm.trim(),
        searchColumns: cols,
      });
    }, SEARCH_DEBOUNCE_MS);
  }, [onServerSearch]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle quick search input changes
  const handleQuickSearchChange = React.useCallback((value: string) => {
    setQuickSearch(value);
    
    // If server search is enabled, use it
    if (onServerSearch) {
      triggerServerSearch(value, searchColumns);
    } else {
      // Fall back to client-side filtering (legacy behavior)
      if (value.trim()) {
        const quickFilter: ColumnFilter = {
          column: '__quicksearch__',
          operator: 'contains',
          value: value.trim(),
        };
        const otherFilters = filters.filter((f) => f.column !== '__quicksearch__');
        onFiltersChange([quickFilter, ...otherFilters]);
      } else {
        const otherFilters = filters.filter((f) => f.column !== '__quicksearch__');
        if (otherFilters.length !== filters.length) {
          onFiltersChange(otherFilters);
        }
      }
    }
  }, [filters, onFiltersChange, onServerSearch, searchColumns, triggerServerSearch]);

  // Handle column selection toggle
  const handleColumnToggle = React.useCallback((column: string) => {
    setSearchColumns(prev => {
      const newCols = prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column];
      
      // Re-trigger search with new columns if there's an active search
      if (quickSearch.trim().length >= MIN_SEARCH_CHARS && onServerSearch) {
        triggerServerSearch(quickSearch, newCols);
      }
      
      return newCols;
    });
  }, [quickSearch, onServerSearch, triggerServerSearch]);

  // Select all columns
  const handleSelectAllColumns = React.useCallback(() => {
    setSearchColumns(columns);
    if (quickSearch.trim().length >= MIN_SEARCH_CHARS && onServerSearch) {
      triggerServerSearch(quickSearch, columns);
    }
  }, [columns, quickSearch, onServerSearch, triggerServerSearch]);

  // Clear column selection
  const handleClearColumns = React.useCallback(() => {
    setSearchColumns([]);
    onServerSearch?.(null);
  }, [onServerSearch]);

  const handleAddFilter = () => {
    if (!selectedColumn) return;
    if (!OPERATORS_WITHOUT_VALUE.includes(selectedOperator) && !filterValue.trim()) return;

    const newFilter: ColumnFilter = {
      column: selectedColumn,
      operator: selectedOperator,
      value: filterValue.trim(),
    };

    onFiltersChange([...filters, newFilter]);
    setSelectedColumn('');
    setSelectedOperator('contains');
    setFilterValue('');
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    setQuickSearch('');
    setSearchColumns([]);
    onServerSearch?.(null);
  };

  const getFilterLabel = (filter: ColumnFilter) => {
    if (filter.column === '__quicksearch__') {
      return `Search: "${filter.value}"`;
    }
    if (OPERATORS_WITHOUT_VALUE.includes(filter.operator)) {
      return `${filter.column} ${FILTER_OPERATOR_LABELS[filter.operator].toLowerCase()}`;
    }
    return `${filter.column} ${FILTER_OPERATOR_LABELS[filter.operator].toLowerCase()} "${filter.value}"`;
  };

  const needsValue = !OPERATORS_WITHOUT_VALUE.includes(selectedOperator);
  const columnFilters = filters.filter((f) => f.column !== '__quicksearch__');
  
  // Determine placeholder text based on mode and column selection
  const getSearchPlaceholder = () => {
    if (!onServerSearch) {
      return 'Quick search all columns...';
    }
    if (searchColumns.length === 0) {
      return 'Select columns first...';
    }
    if (searchColumns.length === columns.length) {
      return 'Search all columns (min 3 chars)...';
    }
    if (searchColumns.length === 1) {
      return `Search in ${searchColumns[0]} (min 3 chars)...`;
    }
    return `Search in ${searchColumns.length} columns (min 3 chars)...`;
  };

  // Check if search input should be disabled
  const isSearchDisabled = onServerSearch && searchColumns.length === 0;

  return (
    <div className="space-y-2">
      {/* Quick Search - Always Visible */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Column Selector (only when server search is enabled) */}
        {onServerSearch && (
          <Popover open={columnSelectorOpen} onOpenChange={setColumnSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={columnSelectorOpen}
                className="h-9 min-w-[140px] justify-between"
              >
                <span className="truncate">
                  {searchColumns.length === 0
                    ? 'Select columns'
                    : searchColumns.length === columns.length
                    ? 'All columns'
                    : `${searchColumns.length} column${searchColumns.length > 1 ? 's' : ''}`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-2" align="start">
              {/* Quick actions */}
              <div className="flex gap-2 mb-2 pb-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleSelectAllColumns}
                >
                  <Check className="mr-1 h-3 w-3" />
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleClearColumns}
                  disabled={searchColumns.length === 0}
                >
                  <X className="mr-1 h-3 w-3" />
                  None
                </Button>
              </div>
              
              {/* Column filter search - only show if more than 6 columns */}
              {columns.length > 6 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter columns..."
                    value={columnFilterText}
                    onChange={(e) => setColumnFilterText(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                  {columnFilterText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
                      onClick={() => setColumnFilterText('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Column list */}
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredColumnsList.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No columns match &quot;{columnFilterText}&quot;
                    </div>
                  ) : (
                    filteredColumnsList.map((column) => {
                      const isSelected = searchColumns.includes(column);
                      return (
                        <button
                          key={column}
                          type="button"
                          onClick={() => handleColumnToggle(column)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent transition-colors',
                            isSelected && 'bg-accent'
                          )}
                        >
                          <div className={cn(
                            'h-4 w-4 border rounded-sm flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-primary border-primary' : 'border-input'
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="font-mono text-xs truncate">{column}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              
              {/* Selection count */}
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground text-center">
                {searchColumns.length} of {columns.length} selected
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          {isSearching ? (
            <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder={getSearchPlaceholder()}
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            className={cn('pl-9 h-9', isSearchDisabled && 'opacity-50')}
            disabled={isSearchDisabled}
          />
          {quickSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => handleQuickSearchChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Min chars hint */}
        {onServerSearch && quickSearch && quickSearch.length < MIN_SEARCH_CHARS && quickSearch.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {MIN_SEARCH_CHARS - quickSearch.length} more char{MIN_SEARCH_CHARS - quickSearch.length > 1 ? 's' : ''} needed
          </span>
        )}

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Advanced Filter</span>
              {columnFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {columnFilters.length}
                </Badge>
              )}
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {(filters.length > 0 || quickSearch || searchColumns.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={handleClearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced Filters - Collapsible */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleContent>
          <div className="p-3 border rounded-md bg-muted/30 space-y-3">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1.5 min-w-[150px]">
                <label className="text-xs text-muted-foreground">Column</label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-[150px]">
                <label className="text-xs text-muted-foreground">Operator</label>
                <Select
                  value={selectedOperator}
                  onValueChange={(v) => setSelectedOperator(v as FilterOperator)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FILTER_OPERATOR_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsValue && (
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <label className="text-xs text-muted-foreground">Value</label>
                  <Input
                    placeholder="Filter value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddFilter();
                      }
                    }}
                  />
                </div>
              )}

              <Button
                size="sm"
                className="h-8"
                onClick={handleAddFilter}
                disabled={!selectedColumn || (needsValue && !filterValue.trim())}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter, index) => (
            <Badge
              key={`${filter.column}-${filter.operator}-${index}`}
              variant={filter.column === '__quicksearch__' ? 'default' : 'secondary'}
              className="gap-1 pr-1"
            >
              <span className="max-w-[200px] truncate">{getFilterLabel(filter)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={() => {
                  if (filter.column === '__quicksearch__') {
                    handleQuickSearchChange('');
                  } else {
                    handleRemoveFilter(index);
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function applyFilters(
  rows: Record<string, unknown>[],
  filters: ColumnFilter[]
): Record<string, unknown>[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) => {
    return filters.every((filter) => {
      // Handle quick search (search all columns)
      if (filter.column === '__quicksearch__') {
        const searchValue = filter.value.toLowerCase();
        return Object.values(row).some((cellValue) => {
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(searchValue);
        });
      }

      const cellValue = row[filter.column];
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'exact_match':
        case 'equals':
          return String(cellValue) === filterValue;

        case 'not_equals':
          return String(cellValue) !== filterValue;

        case 'contains':
          return String(cellValue ?? '')
            .toLowerCase()
            .includes(filterValue.toLowerCase());

        case 'not_contains':
          return !String(cellValue ?? '')
            .toLowerCase()
            .includes(filterValue.toLowerCase());

        case 'exists':
          return cellValue !== null && cellValue !== undefined;

        case 'not_exists':
          return cellValue === null || cellValue === undefined;

        case 'starts_with':
          return String(cellValue ?? '')
            .toLowerCase()
            .startsWith(filterValue.toLowerCase());

        case 'ends_with':
          return String(cellValue ?? '')
            .toLowerCase()
            .endsWith(filterValue.toLowerCase());

        case 'greater_than': {
          const numVal = Number(cellValue);
          const filterNum = Number(filterValue);
          if (isNaN(numVal) || isNaN(filterNum)) return false;
          return numVal > filterNum;
        }

        case 'less_than': {
          const numVal = Number(cellValue);
          const filterNum = Number(filterValue);
          if (isNaN(numVal) || isNaN(filterNum)) return false;
          return numVal < filterNum;
        }

        case 'greater_than_or_equal': {
          const numVal = Number(cellValue);
          const filterNum = Number(filterValue);
          if (isNaN(numVal) || isNaN(filterNum)) return false;
          return numVal >= filterNum;
        }

        case 'less_than_or_equal': {
          const numVal = Number(cellValue);
          const filterNum = Number(filterValue);
          if (isNaN(numVal) || isNaN(filterNum)) return false;
          return numVal <= filterNum;
        }

        default:
          return true;
      }
    });
  });
}
