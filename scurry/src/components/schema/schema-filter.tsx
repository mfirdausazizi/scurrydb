'use client';

import * as React from 'react';
import { Search, Filter, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
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
import type { ColumnFilter, FilterOperator } from '@/types';
import { FILTER_OPERATOR_LABELS } from '@/types';

interface SchemaFilterProps {
  columns: string[];
  filters: ColumnFilter[];
  onFiltersChange: (filters: ColumnFilter[]) => void;
}

const OPERATORS_WITHOUT_VALUE: FilterOperator[] = ['exists', 'not_exists'];

export function SchemaFilter({ columns, filters, onFiltersChange }: SchemaFilterProps) {
  const [quickSearch, setQuickSearch] = React.useState('');
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [selectedColumn, setSelectedColumn] = React.useState<string>('');
  const [selectedOperator, setSelectedOperator] = React.useState<FilterOperator>('contains');
  const [filterValue, setFilterValue] = React.useState('');

  // Handle quick search changes
  const handleQuickSearchChange = React.useCallback((value: string) => {
    setQuickSearch(value);
    
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
  }, [filters, onFiltersChange]);

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

  return (
    <div className="space-y-2">
      {/* Quick Search - Always Visible */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Quick search all columns..."
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            className="pl-9 h-9"
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

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Advanced Filter</span>
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

        {(filters.length > 0 || quickSearch) && (
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
