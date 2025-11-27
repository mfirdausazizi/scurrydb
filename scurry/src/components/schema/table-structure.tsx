'use client';

import * as React from 'react';
import { Key, Hash, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ResultsTable } from '@/components/results';
import type { ColumnDefinition, IndexInfo, QueryResult } from '@/types';

interface TableStructureProps {
  tableName: string;
  columns: ColumnDefinition[];
  indexes: IndexInfo[];
  preview: QueryResult | null;
  loading: boolean;
  previewLoading: boolean;
  onLoadPreview: () => void;
}

export function TableStructure({
  tableName,
  columns,
  indexes,
  preview,
  loading,
  previewLoading,
  onLoadPreview,
}: TableStructureProps) {
  const [activeTab, setActiveTab] = React.useState('columns');

  React.useEffect(() => {
    if (activeTab === 'data' && !preview && !previewLoading) {
      onLoadPreview();
    }
  }, [activeTab, preview, previewLoading, onLoadPreview]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">{tableName}</h2>
        <Badge variant="outline">{columns.length} columns</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="data">Data Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Nullable</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[100px]">Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-mono">{column.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {column.type}
                    </TableCell>
                    <TableCell>
                      {column.nullable ? (
                        <span className="text-muted-foreground">Yes</span>
                      ) : (
                        <span className="text-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {column.defaultValue || (
                        <span className="text-muted-foreground italic">NULL</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {column.isPrimaryKey && (
                        <Badge variant="default" className="gap-1">
                          <Key className="h-3 w-3" />
                          PK
                        </Badge>
                      )}
                      {column.isForeignKey && (
                        <Badge variant="secondary" className="gap-1">
                          <Hash className="h-3 w-3" />
                          FK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="indexes" className="mt-4">
          {indexes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No indexes found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead className="w-[100px]">Unique</TableHead>
                    <TableHead className="w-[100px]">Primary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indexes.map((index) => (
                    <TableRow key={index.name}>
                      <TableCell className="font-mono">{index.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {index.columns.join(', ')}
                      </TableCell>
                      <TableCell>
                        {index.unique ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {index.primary ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          {previewLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            preview.error ? (
              <div className="text-center py-8 text-destructive">
                {preview.error}
              </div>
            ) : (
              <ResultsTable result={preview} />
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click to load data preview
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
