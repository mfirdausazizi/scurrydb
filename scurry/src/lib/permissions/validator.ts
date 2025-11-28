import type { EffectivePermission } from '../db/permissions';

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  violationType?: 'table' | 'column' | 'write';
}

/**
 * Extract table names from SQL query using regex patterns
 * This is a simplified parser - for production, consider using a proper SQL parser
 */
function extractTableNames(sql: string): string[] {
  const tables = new Set<string>();
  const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ');
  
  // Match FROM clause
  const fromMatches = normalizedSql.matchAll(/from\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of fromMatches) {
    if (match[1]) tables.add(match[1].toLowerCase());
  }
  
  // Match JOIN clauses
  const joinMatches = normalizedSql.matchAll(/join\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of joinMatches) {
    if (match[1]) tables.add(match[1].toLowerCase());
  }
  
  // Match INSERT INTO
  const insertMatches = normalizedSql.matchAll(/insert\s+into\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of insertMatches) {
    if (match[1]) tables.add(match[1].toLowerCase());
  }
  
  // Match UPDATE
  const updateMatches = normalizedSql.matchAll(/update\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of updateMatches) {
    if (match[1]) tables.add(match[1].toLowerCase());
  }
  
  // Match DELETE FROM
  const deleteMatches = normalizedSql.matchAll(/delete\s+from\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of deleteMatches) {
    if (match[1]) tables.add(match[1].toLowerCase());
  }
  
  return Array.from(tables);
}

/**
 * Extract column names from SELECT statement
 * This is a simplified parser - for production, consider using a proper SQL parser
 */
function extractColumnNames(sql: string, tableName: string): string[] {
  const columns = new Set<string>();
  const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ');
  
  // Check for SELECT *
  if (normalizedSql.includes('select *')) {
    return ['*']; // Special marker for all columns
  }
  
  // Extract columns from SELECT clause
  const selectMatch = normalizedSql.match(/select\s+(.*?)\s+from/i);
  if (selectMatch && selectMatch[1]) {
    const columnsPart = selectMatch[1];
    
    // Split by comma and extract column names
    const parts = columnsPart.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      
      // Handle table.column or just column
      const columnMatch = trimmed.match(/(?:([a-z_][a-z0-9_]*)\.)?\s*([a-z_][a-z0-9_]*)/i);
      if (columnMatch) {
        const table = columnMatch[1];
        const column = columnMatch[2];
        
        // If table is specified and matches, or no table specified
        if (!table || table.toLowerCase() === tableName.toLowerCase()) {
          columns.add(column.toLowerCase());
        }
      }
    }
  }
  
  // Extract columns from WHERE clause
  const whereMatch = normalizedSql.match(/where\s+(.*?)(?:\s+(?:group|order|limit|$))/i);
  if (whereMatch && whereMatch[1]) {
    const wherePart = whereMatch[1];
    const columnMatches = wherePart.matchAll(/(?:([a-z_][a-z0-9_]*)\.)?\s*([a-z_][a-z0-9_]*)\s*[=<>!]/gi);
    
    for (const match of columnMatches) {
      const table = match[1];
      const column = match[2];
      
      if (!table || table.toLowerCase() === tableName.toLowerCase()) {
        columns.add(column.toLowerCase());
      }
    }
  }
  
  return Array.from(columns);
}

/**
 * Check if SQL query is a write operation (INSERT, UPDATE, DELETE, DROP, ALTER, etc.)
 */
function isWriteQuery(sql: string): boolean {
  const normalizedSql = sql.trim().toLowerCase();
  const writeKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'replace'];
  
  for (const keyword of writeKeywords) {
    if (normalizedSql.startsWith(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate SQL query against effective permissions
 */
export function validateQuery(
  sql: string,
  permission: EffectivePermission | null
): ValidationResult {
  // If no permission, deny access
  if (!permission) {
    return {
      allowed: false,
      reason: 'No permission assigned for this connection',
    };
  }
  
  // Check view permission
  if (!permission.canView) {
    return {
      allowed: false,
      reason: 'You do not have view permission for this connection',
    };
  }
  
  // Check write permission for write queries
  const isWrite = isWriteQuery(sql);
  if (isWrite && !permission.canEdit) {
    return {
      allowed: false,
      reason: 'You do not have edit permission for this connection',
      violationType: 'write',
    };
  }
  
  // Extract tables from query
  const tables = extractTableNames(sql);
  
  // Check table restrictions
  if (permission.allowedTables !== null) {
    for (const table of tables) {
      if (!permission.allowedTables.has(table.toLowerCase())) {
        return {
          allowed: false,
          reason: `You do not have access to table: ${table}`,
          violationType: 'table',
        };
      }
    }
  }
  
  // Check column restrictions
  for (const table of tables) {
    const hiddenColumns = permission.hiddenColumns.get(table.toLowerCase());
    if (hiddenColumns && hiddenColumns.size > 0) {
      const columns = extractColumnNames(sql, table);
      
      // If SELECT *, check if there are any hidden columns
      if (columns.includes('*')) {
        return {
          allowed: false,
          reason: `Cannot use SELECT * on table ${table} because some columns are restricted. Please specify columns explicitly.`,
          violationType: 'column',
        };
      }
      
      // Check if any requested column is hidden
      for (const column of columns) {
        if (hiddenColumns.has(column.toLowerCase())) {
          return {
            allowed: false,
            reason: `You do not have access to column: ${table}.${column}`,
            violationType: 'column',
          };
        }
      }
    }
  }
  
  // All checks passed
  return {
    allowed: true,
  };
}

/**
 * Filter table list based on permissions
 */
export function filterAllowedTables(
  tables: string[],
  permission: EffectivePermission | null
): string[] {
  if (!permission || !permission.canView) {
    return [];
  }
  
  if (permission.allowedTables === null) {
    return tables; // All tables allowed
  }
  
  return tables.filter(table => 
    permission.allowedTables!.has(table.toLowerCase())
  );
}

/**
 * Filter column list based on permissions
 */
export function filterAllowedColumns(
  tableName: string,
  columns: string[],
  permission: EffectivePermission | null
): string[] {
  if (!permission || !permission.canView) {
    return [];
  }
  
  const hiddenColumns = permission.hiddenColumns.get(tableName.toLowerCase());
  if (!hiddenColumns || hiddenColumns.size === 0) {
    return columns; // All columns allowed
  }
  
  return columns.filter(column => 
    !hiddenColumns.has(column.toLowerCase())
  );
}

