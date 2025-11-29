/**
 * SQL Utilities for safe identifier handling and query building
 * Prevents SQL injection by validating and properly quoting identifiers
 */

export type DatabaseType = 'mysql' | 'mariadb' | 'postgresql' | 'sqlite';

/**
 * Validates that an identifier (table name, column name) is safe
 * Only allows alphanumeric characters and underscores, starting with a letter or underscore
 */
export function validateIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  // Allow letters, numbers, underscores. Must start with letter or underscore.
  // Also allow dots for schema-qualified names (e.g., public.users)
  return /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(name);
}

/**
 * Quotes an identifier for safe use in SQL queries
 * Uses backticks for MySQL/MariaDB, double quotes for PostgreSQL/SQLite
 * @throws Error if identifier is invalid
 */
export function quoteIdentifier(name: string, dbType: DatabaseType): string {
  if (!validateIdentifier(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  
  // Handle schema-qualified names
  if (name.includes('.')) {
    const parts = name.split('.');
    return parts.map(part => quoteIdentifierPart(part, dbType)).join('.');
  }
  
  return quoteIdentifierPart(name, dbType);
}

function quoteIdentifierPart(name: string, dbType: DatabaseType): string {
  switch (dbType) {
    case 'mysql':
    case 'mariadb':
      return `\`${name}\``;
    case 'postgresql':
    case 'sqlite':
      return `"${name}"`;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

/**
 * Validates that a table name exists in the provided list of valid tables
 * Case-insensitive comparison for flexibility
 */
export function validateTableExists(
  tableName: string,
  validTables: Array<{ name: string }>
): { valid: boolean; actualName: string | null } {
  const normalizedInput = tableName.toLowerCase();
  const match = validTables.find(t => t.name.toLowerCase() === normalizedInput);
  
  return {
    valid: !!match,
    actualName: match?.name || null,
  };
}

/**
 * Validates that column names exist in the provided list of valid columns
 * Returns the list of valid column names
 */
export function validateColumns(
  columnNames: string[],
  validColumns: Array<{ name: string }>
): { valid: boolean; validColumnNames: string[]; invalidColumns: string[] } {
  const validColumnSet = new Set(validColumns.map(c => c.name.toLowerCase()));
  const validColumnNames: string[] = [];
  const invalidColumns: string[] = [];
  
  for (const col of columnNames) {
    if (validColumnSet.has(col.toLowerCase())) {
      // Find the actual name with correct casing
      const actualCol = validColumns.find(c => c.name.toLowerCase() === col.toLowerCase());
      if (actualCol) {
        validColumnNames.push(actualCol.name);
      }
    } else {
      invalidColumns.push(col);
    }
  }
  
  return {
    valid: invalidColumns.length === 0,
    validColumnNames,
    invalidColumns,
  };
}

/**
 * Gets the placeholder syntax for a database type
 * MySQL uses ?, PostgreSQL uses $1, $2, etc.
 */
export function getPlaceholder(dbType: DatabaseType, index: number): string {
  switch (dbType) {
    case 'mysql':
    case 'mariadb':
    case 'sqlite':
      return '?';
    case 'postgresql':
      return `$${index}`;
    default:
      return '?';
  }
}

/**
 * Builds a parameterized WHERE clause from primary key columns
 * Returns the SQL fragment and the parameter values
 */
export function buildParameterizedWhereClause(
  primaryKeyColumns: string[],
  rowData: Record<string, unknown>,
  dbType: DatabaseType,
  startIndex: number = 1
): { sql: string; params: unknown[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startIndex;
  
  for (const col of primaryKeyColumns) {
    const value = rowData[col];
    const quotedCol = quoteIdentifier(col, dbType);
    
    if (value === null || value === undefined) {
      conditions.push(`${quotedCol} IS NULL`);
    } else {
      conditions.push(`${quotedCol} = ${getPlaceholder(dbType, paramIndex)}`);
      params.push(value);
      paramIndex++;
    }
  }
  
  return {
    sql: conditions.join(' AND '),
    params,
    nextIndex: paramIndex,
  };
}

/**
 * Builds a parameterized SET clause for UPDATE statements
 * Returns the SQL fragment and the parameter values
 */
export function buildParameterizedSetClause(
  updates: Record<string, unknown>,
  dbType: DatabaseType,
  startIndex: number = 1
): { sql: string; params: unknown[]; nextIndex: number } {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = startIndex;
  
  for (const [col, value] of Object.entries(updates)) {
    const quotedCol = quoteIdentifier(col, dbType);
    setClauses.push(`${quotedCol} = ${getPlaceholder(dbType, paramIndex)}`);
    params.push(value);
    paramIndex++;
  }
  
  return {
    sql: setClauses.join(', '),
    params,
    nextIndex: paramIndex,
  };
}

/**
 * Builds a parameterized INSERT statement
 * Returns the SQL and the parameter values
 */
export function buildParameterizedInsert(
  tableName: string,
  values: Record<string, unknown>,
  dbType: DatabaseType
): { sql: string; params: unknown[] } {
  const quotedTable = quoteIdentifier(tableName, dbType);
  const columns = Object.keys(values);
  const params = Object.values(values);
  
  const quotedColumns = columns.map(col => quoteIdentifier(col, dbType)).join(', ');
  const placeholders = columns.map((_, i) => getPlaceholder(dbType, i + 1)).join(', ');
  
  return {
    sql: `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${placeholders})`,
    params,
  };
}

/**
 * Builds a parameterized DELETE statement
 * Returns the SQL and the parameter values
 */
export function buildParameterizedDelete(
  tableName: string,
  primaryKeyColumns: string[],
  rowData: Record<string, unknown>,
  dbType: DatabaseType
): { sql: string; params: unknown[] } {
  const quotedTable = quoteIdentifier(tableName, dbType);
  const whereClause = buildParameterizedWhereClause(primaryKeyColumns, rowData, dbType);
  
  return {
    sql: `DELETE FROM ${quotedTable} WHERE ${whereClause.sql}`,
    params: whereClause.params,
  };
}

/**
 * Builds a parameterized UPDATE statement
 * Returns the SQL and the parameter values
 */
export function buildParameterizedUpdate(
  tableName: string,
  updates: Record<string, unknown>,
  primaryKeyColumns: string[],
  rowIdentifier: Record<string, unknown>,
  dbType: DatabaseType
): { sql: string; params: unknown[] } {
  const quotedTable = quoteIdentifier(tableName, dbType);
  
  const setClause = buildParameterizedSetClause(updates, dbType, 1);
  const whereClause = buildParameterizedWhereClause(
    primaryKeyColumns,
    rowIdentifier,
    dbType,
    setClause.nextIndex
  );
  
  return {
    sql: `UPDATE ${quotedTable} SET ${setClause.sql} WHERE ${whereClause.sql}`,
    params: [...setClause.params, ...whereClause.params],
  };
}

/**
 * Safely generates SQL for preview purposes only (not for execution)
 * This escapes values for display but should NEVER be used to execute queries
 */
export function escapeValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'string') {
    // Escape single quotes and show truncated if too long
    const escaped = value.replace(/'/g, "''");
    if (escaped.length > 100) {
      return `'${escaped.substring(0, 97)}...'`;
    }
    return `'${escaped}'`;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    const escaped = json.replace(/'/g, "''");
    if (escaped.length > 100) {
      return `'${escaped.substring(0, 97)}...'`;
    }
    return `'${escaped}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}
