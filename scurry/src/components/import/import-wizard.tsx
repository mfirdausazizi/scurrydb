'use client';

import * as React from 'react';
import {
  FileUp,
  FileSpreadsheet,
  FileCode,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Table2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  parseCSV,
  inferColumnTypes,
  generateCreateTableSQL,
  mapToDbType,
  validateMappings,
  type CSVParseResult,
  type ColumnMapping,
  type InferredColumnType,
} from '@/lib/import/csv-importer';
import {
  readSQLFile,
  parseSQLStatements,
  previewStatements,
  validateSQLStatements,
  estimateImportTime,
  type ParsedStatement,
} from '@/lib/import/sql-importer';
import type { DatabaseType } from '@/types';

// SafeConnection doesn't expose password
interface SafeConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  color?: string;
}

type ImportType = 'csv' | 'sql';
type WizardStep = 'select-type' | 'upload' | 'configure' | 'preview' | 'importing' | 'complete';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connections: SafeConnection[];
  selectedConnectionId: string | null;
  teamId?: string | null;
  onComplete?: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    insertedRows?: number;
    totalRows?: number;
    executedStatements?: number;
    totalStatements?: number;
    errors?: Array<{ row?: number; line?: number; error: string }>;
  };
}

export function ImportWizard({
  open,
  onOpenChange,
  connections,
  selectedConnectionId,
  teamId,
  onComplete,
}: ImportWizardProps) {
  const [step, setStep] = React.useState<WizardStep>('select-type');
  const [importType, setImportType] = React.useState<ImportType | null>(null);
  const [connectionId, setConnectionId] = React.useState<string>(selectedConnectionId || '');
  const [file, setFile] = React.useState<File | null>(null);
  
  // CSV state
  const [csvData, setCsvData] = React.useState<CSVParseResult | null>(null);
  const [columnMappings, setColumnMappings] = React.useState<ColumnMapping[]>([]);
  const [inferredTypes, setInferredTypes] = React.useState<InferredColumnType[]>([]);
  const [tableName, setTableName] = React.useState('');
  const [createNewTable, setCreateNewTable] = React.useState(true);
  
  // SQL state
  const [sqlContent, setSqlContent] = React.useState<string>('');
  const [sqlStatements, setSqlStatements] = React.useState<ParsedStatement[]>([]);
  const [stopOnError, setStopOnError] = React.useState(false);
  
  // Import state
  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  
  const selectedConnection = connections.find(c => c.id === connectionId);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep('select-type');
      setImportType(null);
      setConnectionId(selectedConnectionId || connections[0]?.id || '');
      setFile(null);
      setCsvData(null);
      setColumnMappings([]);
      setInferredTypes([]);
      setTableName('');
      setCreateNewTable(true);
      setSqlContent('');
      setSqlStatements([]);
      setStopOnError(false);
      setImporting(false);
      setImportResult(null);
    }
  }, [open, selectedConnectionId, connections]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    try {
      if (importType === 'csv') {
        const result = await parseCSV(selectedFile);
        setCsvData(result);
        
        // Infer column types
        const types = inferColumnTypes(result.rows, result.headers);
        setInferredTypes(types);
        
        // Create initial mappings
        const mappings: ColumnMapping[] = result.headers.map((header, index) => ({
          csvColumn: header,
          csvColumnIndex: index,
          dbColumn: sanitizeColumnName(header),
          dbType: mapToDbType(types[index].inferredType, selectedConnection?.type as DatabaseType || 'postgresql'),
          skip: false,
        }));
        setColumnMappings(mappings);
        
        // Suggest table name from file name
        const suggestedName = selectedFile.name
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars
          .toLowerCase();
        setTableName(suggestedName || 'imported_data');
        
        setStep('configure');
      } else if (importType === 'sql') {
        const content = await readSQLFile(selectedFile);
        setSqlContent(content);
        
        const statements = parseSQLStatements(content);
        setSqlStatements(statements);
        
        setStep('preview');
      }
    } catch (error) {
      toast.error('Failed to parse file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleImport = async () => {
    if (!connectionId) {
      toast.error('Please select a connection');
      return;
    }
    
    setImporting(true);
    setStep('importing');
    
    try {
      if (importType === 'csv' && csvData) {
        // Validate mappings
        const validationErrors = validateMappings(columnMappings);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join('\n'));
        }
        
        // Generate CREATE TABLE SQL if needed
        let createTableSQL: string | undefined;
        if (createNewTable) {
          createTableSQL = generateCreateTableSQL(
            tableName,
            columnMappings,
            selectedConnection?.type as DatabaseType || 'postgresql'
          );
        }
        
        const response = await fetch('/api/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId,
            tableName,
            createTable: createNewTable,
            createTableSQL,
            columns: columnMappings,
            rows: csvData.rows,
            teamId,
          }),
        });
        
        const result = await response.json();
        
        setImportResult({
          success: result.success,
          message: result.success 
            ? `Successfully imported ${result.insertedRows} rows`
            : `Import completed with errors`,
          details: {
            insertedRows: result.insertedRows,
            totalRows: result.totalRows,
            errors: result.errors,
          },
        });
      } else if (importType === 'sql') {
        const response = await fetch('/api/import/sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId,
            sql: sqlContent,
            stopOnError,
            teamId,
          }),
        });
        
        const result = await response.json();
        
        setImportResult({
          success: result.success,
          message: result.success
            ? `Successfully executed ${result.executedStatements} statements`
            : `Executed ${result.executedStatements} of ${result.totalStatements} statements`,
          details: {
            executedStatements: result.executedStatements,
            totalStatements: result.totalStatements,
            errors: result.errors?.map((e: { line?: number; error: string }) => ({
              line: e.line,
              error: e.error,
            })),
          },
        });
      }
      
      setStep('complete');
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
      });
      setStep('complete');
    } finally {
      setImporting(false);
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const canProceed = () => {
    switch (step) {
      case 'select-type':
        return importType !== null && connectionId !== '';
      case 'upload':
        return file !== null;
      case 'configure':
        return tableName.trim() !== '' && columnMappings.some(m => !m.skip);
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'select-type':
        setStep('upload');
        break;
      case 'upload':
        // File handling moves us forward automatically
        break;
      case 'configure':
        setStep('preview');
        break;
      case 'preview':
        handleImport();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'upload':
        setStep('select-type');
        break;
      case 'configure':
        setStep('upload');
        break;
      case 'preview':
        setStep(importType === 'csv' ? 'configure' : 'upload');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            {step === 'select-type' && 'Select the type of data you want to import'}
            {step === 'upload' && 'Upload your file'}
            {step === 'configure' && 'Configure column mappings'}
            {step === 'preview' && 'Review and confirm import'}
            {step === 'importing' && 'Importing data...'}
            {step === 'complete' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Select Type */}
          {step === 'select-type' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Connection</Label>
                <Select value={connectionId} onValueChange={setConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Import Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      importType === 'csv'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setImportType('csv')}
                  >
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-forest" />
                    <p className="font-medium">CSV File</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Import from CSV with column mapping
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      importType === 'sql'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                    onClick={() => setImportType('sql')}
                  >
                    <FileCode className="h-8 w-8 mx-auto mb-2 text-sky-500" />
                    <p className="font-medium">SQL File</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute SQL statements from file
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">
                  {file ? file.name : 'Click to select file'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {importType === 'csv' ? 'CSV files (.csv)' : 'SQL files (.sql)'}
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept={importType === 'csv' ? '.csv' : '.sql'}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
              
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-forest" />
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure (CSV only) */}
          {step === 'configure' && csvData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Table Name</Label>
                  <Input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                    placeholder="my_table"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="invisible">Action</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Checkbox
                      id="create-table"
                      checked={createNewTable}
                      onCheckedChange={(checked) => setCreateNewTable(!!checked)}
                    />
                    <label htmlFor="create-table" className="text-sm cursor-pointer">
                      Create new table
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Column Mappings</Label>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">CSV Column</th>
                        <th className="p-2 text-left">DB Column</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-center">Skip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnMappings.map((mapping, index) => (
                        <tr key={index} className={mapping.skip ? 'opacity-50' : ''}>
                          <td className="p-2 border-t">
                            <div>
                              <span>{mapping.csvColumn}</span>
                              {inferredTypes[index] && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {inferredTypes[index].inferredType}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2 border-t">
                            <Input
                              value={mapping.dbColumn}
                              onChange={(e) => {
                                const newMappings = [...columnMappings];
                                newMappings[index].dbColumn = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                                setColumnMappings(newMappings);
                              }}
                              className="h-8"
                              disabled={mapping.skip}
                            />
                          </td>
                          <td className="p-2 border-t">
                            <Select
                              value={mapping.dbType}
                              onValueChange={(value) => {
                                const newMappings = [...columnMappings];
                                newMappings[index].dbType = value;
                                setColumnMappings(newMappings);
                              }}
                              disabled={mapping.skip}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TEXT">TEXT</SelectItem>
                                <SelectItem value="INTEGER">INTEGER</SelectItem>
                                <SelectItem value="BIGINT">BIGINT</SelectItem>
                                <SelectItem value="DECIMAL(20,6)">DECIMAL</SelectItem>
                                <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                                <SelectItem value="DATE">DATE</SelectItem>
                                <SelectItem value="TIMESTAMP">TIMESTAMP</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 border-t text-center">
                            <Checkbox
                              checked={mapping.skip}
                              onCheckedChange={(checked) => {
                                const newMappings = [...columnMappings];
                                newMappings[index].skip = !!checked;
                                setColumnMappings(newMappings);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {importType === 'csv' && csvData && (
                <>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                      <span>Table: <strong>{tableName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      <span>Rows: <strong>{csvData.totalRows}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Columns: <strong>{columnMappings.filter(m => !m.skip).length}</strong></span>
                    </div>
                  </div>
                  
                  {createNewTable && (
                    <div className="space-y-2">
                      <Label>CREATE TABLE SQL</Label>
                      <ScrollArea className="h-[150px] border rounded-lg bg-muted/30">
                        <pre className="p-3 text-xs font-mono">
                          {generateCreateTableSQL(
                            tableName,
                            columnMappings,
                            selectedConnection?.type as DatabaseType || 'postgresql'
                          )}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Data Preview (first 5 rows)</Label>
                    <ScrollArea className="h-[150px] border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            {columnMappings.filter(m => !m.skip).map((m, i) => (
                              <th key={i} className="p-2 text-left">{m.dbColumn}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.preview.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {columnMappings.filter(m => !m.skip).map((m, colIndex) => (
                                <td key={colIndex} className="p-2 border-t truncate max-w-[150px]">
                                  {row[m.csvColumnIndex] || <span className="text-muted-foreground italic">null</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </>
              )}
              
              {importType === 'sql' && sqlStatements.length > 0 && (
                <>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <span>Statements: <strong>{sqlStatements.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Est. time: <strong>{estimateImportTime(sqlStatements.length)}</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="stop-on-error"
                      checked={stopOnError}
                      onCheckedChange={(checked) => setStopOnError(!!checked)}
                    />
                    <label htmlFor="stop-on-error" className="text-sm cursor-pointer">
                      Stop on first error
                    </label>
                  </div>
                  
                  {(() => {
                    const validation = validateSQLStatements(sqlStatements);
                    if (validation.warnings.length > 0) {
                      return (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium mb-2">
                            <AlertCircle className="h-4 w-4" />
                            Warnings
                          </div>
                          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                            {validation.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="space-y-2">
                    <Label>Statement Preview</Label>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="p-2 space-y-2">
                        {previewStatements(sqlStatements, 10).map((stmt, index) => (
                          <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">
                                {stmt.type.toUpperCase()}
                              </Badge>
                              <span className="text-muted-foreground">{stmt.lineRange}</span>
                            </div>
                            <pre className="font-mono truncate">{stmt.sql.slice(0, 100)}...</pre>
                          </div>
                        ))}
                        {sqlStatements.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground py-2">
                            ... and {sqlStatements.length - 10} more statements
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Importing data...</p>
              <p className="text-sm text-muted-foreground">
                This may take a few moments
              </p>
            </div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-lg ${
                importResult.success 
                  ? 'bg-forest/10 text-forest' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {importResult.success ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
                <div>
                  <p className="font-medium">{importResult.success ? 'Import Successful' : 'Import Completed with Issues'}</p>
                  <p className="text-sm opacity-80">{importResult.message}</p>
                </div>
              </div>
              
              {importResult.details && (
                <div className="space-y-3">
                  {importResult.details.insertedRows !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Rows imported:</span>
                      <span className="font-medium">{importResult.details.insertedRows} / {importResult.details.totalRows}</span>
                    </div>
                  )}
                  
                  {importResult.details.executedStatements !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span>Statements executed:</span>
                      <span className="font-medium">{importResult.details.executedStatements} / {importResult.details.totalStatements}</span>
                    </div>
                  )}
                  
                  {importResult.details.errors && importResult.details.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">Errors:</p>
                      <ScrollArea className="h-[150px] border border-destructive/30 rounded-lg">
                        <div className="p-2 space-y-1">
                          {importResult.details.errors.slice(0, 20).map((err, i) => (
                            <div key={i} className="text-xs p-2 bg-destructive/5 rounded">
                              {err.row && <span className="font-medium">Row {err.row}: </span>}
                              {err.line && <span className="font-medium">Line {err.line}: </span>}
                              {err.error}
                            </div>
                          ))}
                          {importResult.details.errors.length > 20 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              ... and {importResult.details.errors.length - 20} more errors
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          {step !== 'select-type' && step !== 'importing' && step !== 'complete' ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {step === 'complete' ? (
            <Button onClick={handleComplete}>
              Done
            </Button>
          ) : step !== 'importing' && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === 'preview' ? (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Import
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .replace(/_+/g, '_') || 'column';
}
