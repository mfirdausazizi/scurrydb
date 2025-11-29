/**
 * CSV Importer
 * 
 * Provides utilities for parsing and importing CSV data into databases.
 * Features:
 * - Stream parsing for large files
 * - Header detection
 * - Type inference
 * - Batch inserts with transaction support
 */

import Papa from 'papaparse';

export interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;
  skipEmptyLines?: boolean;
  preview?: number; // Number of rows to preview
}

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  preview: string[][]; // First N rows for preview
  detectedDelimiter: string;
  errors: Array<{ row: number; message: string }>;
}

export interface ColumnMapping {
  csvColumn: string;
  csvColumnIndex: number;
  dbColumn: string;
  dbType: string;
  skip?: boolean;
}

export interface InferredColumnType {
  column: string;
  inferredType: 'text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime';
  nullCount: number;
  sampleValues: string[];
}

/**
 * Parse a CSV file and return structured data
 */
export async function parseCSV(
  file: File,
  options: CSVParseOptions = {}
): Promise<CSVParseResult> {
  const {
    delimiter,
    hasHeader = true,
    skipEmptyLines = true,
    preview = 10,
  } = options;

  return new Promise((resolve, reject) => {
    const rows: string[][] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let detectedDelimiter = delimiter || ',';

    Papa.parse(file, {
      delimiter: delimiter || undefined, // Auto-detect if not specified
      skipEmptyLines,
      complete: (results) => {
        detectedDelimiter = results.meta.delimiter;
        
        // Process results
        const data = results.data as string[][];
        const headers = hasHeader && data.length > 0 ? data[0] : [];
        const dataRows = hasHeader ? data.slice(1) : data;
        
        // Collect errors
        results.errors.forEach((err) => {
          errors.push({
            row: err.row || 0,
            message: err.message,
          });
        });

        resolve({
          headers: headers.map((h, i) => h || `Column ${i + 1}`),
          rows: dataRows,
          totalRows: dataRows.length,
          preview: dataRows.slice(0, preview),
          detectedDelimiter,
          errors,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Infer column types from sample data
 */
export function inferColumnTypes(
  rows: string[][],
  headers: string[],
  sampleSize: number = 100
): InferredColumnType[] {
  const sampleRows = rows.slice(0, sampleSize);
  
  return headers.map((header, colIndex) => {
    const values = sampleRows.map(row => row[colIndex]).filter(v => v !== undefined && v !== '');
    const nullCount = sampleRows.length - values.length;
    
    // Analyze values to infer type
    let inferredType: InferredColumnType['inferredType'] = 'text';
    
    if (values.length > 0) {
      const allIntegers = values.every(v => /^-?\d+$/.test(v));
      const allDecimals = values.every(v => /^-?\d+\.?\d*$/.test(v));
      const allBooleans = values.every(v => 
        ['true', 'false', '1', '0', 'yes', 'no', 't', 'f'].includes(v.toLowerCase())
      );
      const allDates = values.every(v => isValidDate(v));
      const allDatetimes = values.every(v => isValidDatetime(v));
      
      if (allIntegers) {
        inferredType = 'integer';
      } else if (allDecimals) {
        inferredType = 'decimal';
      } else if (allBooleans) {
        inferredType = 'boolean';
      } else if (allDatetimes) {
        inferredType = 'datetime';
      } else if (allDates) {
        inferredType = 'date';
      }
    }
    
    return {
      column: header,
      inferredType,
      nullCount,
      sampleValues: values.slice(0, 5),
    };
  });
}

/**
 * Check if a string is a valid date
 */
function isValidDate(value: string): boolean {
  // Check common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ];
  
  if (!datePatterns.some(p => p.test(value))) {
    return false;
  }
  
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

/**
 * Check if a string is a valid datetime
 */
function isValidDatetime(value: string): boolean {
  // Check for datetime with time component
  const datetimePatterns = [
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/, // ISO format
    /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, // US format with time
  ];
  
  if (!datetimePatterns.some(p => p.test(value))) {
    return false;
  }
  
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

/**
 * Map inferred types to database types
 */
export function mapToDbType(
  inferredType: InferredColumnType['inferredType'],
  dbType: 'mysql' | 'postgresql' | 'mariadb' | 'sqlite'
): string {
  const typeMap: Record<string, Record<InferredColumnType['inferredType'], string>> = {
    mysql: {
      text: 'TEXT',
      integer: 'BIGINT',
      decimal: 'DECIMAL(20,6)',
      boolean: 'TINYINT(1)',
      date: 'DATE',
      datetime: 'DATETIME',
    },
    mariadb: {
      text: 'TEXT',
      integer: 'BIGINT',
      decimal: 'DECIMAL(20,6)',
      boolean: 'TINYINT(1)',
      date: 'DATE',
      datetime: 'DATETIME',
    },
    postgresql: {
      text: 'TEXT',
      integer: 'BIGINT',
      decimal: 'NUMERIC(20,6)',
      boolean: 'BOOLEAN',
      date: 'DATE',
      datetime: 'TIMESTAMP',
    },
    sqlite: {
      text: 'TEXT',
      integer: 'INTEGER',
      decimal: 'REAL',
      boolean: 'INTEGER',
      date: 'TEXT',
      datetime: 'TEXT',
    },
  };
  
  return typeMap[dbType]?.[inferredType] || 'TEXT';
}

/**
 * Generate CREATE TABLE SQL from column mappings
 */
export function generateCreateTableSQL(
  tableName: string,
  mappings: ColumnMapping[],
  dbType: 'mysql' | 'postgresql' | 'mariadb' | 'sqlite'
): string {
  const activeColumns = mappings.filter(m => !m.skip);
  
  const quotedTable = dbType === 'mysql' || dbType === 'mariadb' 
    ? `\`${tableName}\`` 
    : `"${tableName}"`;
  
  const columnDefs = activeColumns.map(col => {
    const quotedColumn = dbType === 'mysql' || dbType === 'mariadb'
      ? `\`${col.dbColumn}\``
      : `"${col.dbColumn}"`;
    return `  ${quotedColumn} ${col.dbType}`;
  });
  
  return `CREATE TABLE ${quotedTable} (\n${columnDefs.join(',\n')}\n);`;
}

/**
 * Generate INSERT statements for batch import
 */
export function generateInsertBatch(
  tableName: string,
  mappings: ColumnMapping[],
  rows: string[][],
  dbType: 'mysql' | 'postgresql' | 'mariadb' | 'sqlite',
  batchSize: number = 100
): { sql: string; params: unknown[] }[] {
  const activeColumns = mappings.filter(m => !m.skip);
  const batches: { sql: string; params: unknown[] }[] = [];
  
  const quotedTable = dbType === 'mysql' || dbType === 'mariadb' 
    ? `\`${tableName}\`` 
    : `"${tableName}"`;
  
  const quotedColumns = activeColumns.map(col => 
    dbType === 'mysql' || dbType === 'mariadb'
      ? `\`${col.dbColumn}\``
      : `"${col.dbColumn}"`
  ).join(', ');
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batchRows = rows.slice(i, i + batchSize);
    const params: unknown[] = [];
    const valuePlaceholders: string[] = [];
    
    batchRows.forEach((row, rowIndex) => {
      const rowPlaceholders: string[] = [];
      activeColumns.forEach((col, colIndex) => {
        const value = row[col.csvColumnIndex];
        params.push(transformValue(value, col.dbType));
        
        if (dbType === 'postgresql') {
          rowPlaceholders.push(`$${rowIndex * activeColumns.length + colIndex + 1}`);
        } else {
          rowPlaceholders.push('?');
        }
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });
    
    const sql = `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES ${valuePlaceholders.join(', ')}`;
    batches.push({ sql, params });
  }
  
  return batches;
}

/**
 * Transform a string value to the appropriate type
 */
function transformValue(value: string | undefined, dbType: string): unknown {
  if (value === undefined || value === '' || value === null) {
    return null;
  }
  
  const upperType = dbType.toUpperCase();
  
  if (upperType.includes('INT') || upperType === 'BIGINT') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (upperType.includes('DECIMAL') || upperType.includes('NUMERIC') || upperType === 'REAL') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (upperType === 'BOOLEAN' || upperType === 'TINYINT(1)') {
    const lower = value.toLowerCase();
    return ['true', '1', 'yes', 't'].includes(lower);
  }
  
  return value;
}

/**
 * Validate column mappings
 */
export function validateMappings(mappings: ColumnMapping[]): string[] {
  const errors: string[] = [];
  const usedDbColumns = new Set<string>();
  
  mappings.forEach((mapping, index) => {
    if (mapping.skip) return;
    
    if (!mapping.dbColumn.trim()) {
      errors.push(`Column ${index + 1}: Database column name is required`);
    }
    
    if (usedDbColumns.has(mapping.dbColumn.toLowerCase())) {
      errors.push(`Column ${index + 1}: Duplicate database column name "${mapping.dbColumn}"`);
    }
    
    usedDbColumns.add(mapping.dbColumn.toLowerCase());
    
    // Validate column name format
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(mapping.dbColumn)) {
      errors.push(`Column ${index + 1}: Invalid column name "${mapping.dbColumn}". Use only letters, numbers, and underscores.`);
    }
  });
  
  const activeColumns = mappings.filter(m => !m.skip);
  if (activeColumns.length === 0) {
    errors.push('At least one column must be imported');
  }
  
  return errors;
}
