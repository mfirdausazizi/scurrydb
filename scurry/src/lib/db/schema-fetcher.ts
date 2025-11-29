import Database from 'better-sqlite3';
import type { DatabaseConnection, TableInfo, ColumnDefinition, IndexInfo } from '@/types';
import { getPoolManager } from './connection-pool';

export async function fetchTables(connection: DatabaseConnection): Promise<TableInfo[]> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return fetchMySqlTables(connection);
    case 'postgresql':
      return fetchPostgresTables(connection);
    case 'sqlite':
      return fetchSqliteTables(connection);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export async function fetchColumns(
  connection: DatabaseConnection,
  tableName: string
): Promise<ColumnDefinition[]> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return fetchMySqlColumns(connection, tableName);
    case 'postgresql':
      return fetchPostgresColumns(connection, tableName);
    case 'sqlite':
      return fetchSqliteColumns(connection, tableName);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export async function fetchIndexes(
  connection: DatabaseConnection,
  tableName: string
): Promise<IndexInfo[]> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return fetchMySqlIndexes(connection, tableName);
    case 'postgresql':
      return fetchPostgresIndexes(connection, tableName);
    case 'sqlite':
      return fetchSqliteIndexes(connection, tableName);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export async function fetchForeignKeys(
  connection: DatabaseConnection,
  tableName: string
): Promise<ForeignKeyInfo[]> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return fetchMySqlForeignKeys(connection, tableName);
    case 'postgresql':
      return fetchPostgresForeignKeys(connection, tableName);
    case 'sqlite':
      return fetchSqliteForeignKeys(connection, tableName);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export async function fetchAllRelationships(connection: DatabaseConnection): Promise<TableRelationship[]> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return fetchMySqlAllRelationships(connection);
    case 'postgresql':
      return fetchPostgresAllRelationships(connection);
    case 'sqlite':
      return fetchSqliteAllRelationships(connection);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

async function fetchMySqlTables(connection: DatabaseConnection): Promise<TableInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT 
        TABLE_NAME as name,
        TABLE_TYPE as type,
        TABLE_ROWS as row_count,
        COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) as data_length
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [connection.database]
  );

  // MySQL/MariaDB may return column names in different cases
  return result.rows.map((row: Record<string, unknown>) => {
    // Try both lowercase and original case for column names
    const name = (row.name ?? row.NAME ?? row.Name) as string;
    const type = (row.type ?? row.TYPE ?? row.Type) as string;
    const rowCount = (row.row_count ?? row.ROW_COUNT ?? row.TABLE_ROWS ?? 0) as number;
    const dataLength = (row.data_length ?? row.DATA_LENGTH ?? 0) as number;
    
    return {
      name,
      type: type === 'VIEW' ? 'view' as const : 'table' as const,
      rowCount: rowCount || 0,
      dataLength: dataLength || 0,
    };
  });
}

async function fetchPostgresTables(connection: DatabaseConnection): Promise<TableInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT 
        t.table_name as name,
        t.table_type as type,
        COALESCE(s.n_live_tup, 0) as row_count,
        COALESCE(pg_total_relation_size(quote_ident(t.table_name)::regclass), 0) as data_length
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name`
  );

  return result.rows.map((row) => ({
    name: row.name as string,
    schema: 'public',
    type: row.type === 'VIEW' ? 'view' as const : 'table' as const,
    rowCount: Number(row.row_count) || 0,
    dataLength: Number(row.data_length) || 0,
  }));
}

async function fetchMySqlColumns(
  connection: DatabaseConnection,
  tableName: string
): Promise<ColumnDefinition[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT 
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as default_value,
        COLUMN_KEY as column_key,
        EXTRA as extra
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
    [connection.database, tableName]
  );

  return result.rows.map((row) => ({
    name: row.name as string,
    type: row.type as string,
    nullable: row.nullable === 'YES',
    defaultValue: (row.default_value as string | null) || undefined,
    isPrimaryKey: row.column_key === 'PRI',
    isForeignKey: row.column_key === 'MUL',
    autoIncrement: (row.extra as string)?.toLowerCase().includes('auto_increment') || false,
  }));
}

async function fetchPostgresColumns(
  connection: DatabaseConnection,
  tableName: string
): Promise<ColumnDefinition[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT 
        c.column_name as name,
        c.data_type as type,
        c.is_nullable as nullable,
        c.column_default as default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position`,
    [tableName]
  );

  return result.rows.map((row) => {
    // PostgreSQL serial/identity columns have default values starting with 'nextval('
    const defaultValue = (row.default_value as string | null) || undefined;
    const isAutoIncrement = typeof defaultValue === 'string' && 
      (defaultValue.startsWith('nextval(') || defaultValue.includes('_seq\''));
    
    return {
      name: row.name as string,
      type: row.type as string,
      nullable: row.nullable === 'YES',
      defaultValue,
      isPrimaryKey: row.is_primary_key as boolean,
      isForeignKey: false,
      autoIncrement: isAutoIncrement,
    };
  });
}

async function fetchMySqlIndexes(
  connection: DatabaseConnection,
  tableName: string
): Promise<IndexInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT 
        INDEX_NAME as name,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        NOT NON_UNIQUE as is_unique
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      GROUP BY INDEX_NAME, NON_UNIQUE
      ORDER BY INDEX_NAME`,
    [connection.database, tableName]
  );

  return result.rows.map((row) => ({
    name: row.name as string,
    columns: (row.columns as string).split(','),
    unique: Boolean(row.is_unique),
    primary: row.name === 'PRIMARY',
  }));
}

async function fetchPostgresIndexes(
  connection: DatabaseConnection,
  tableName: string
): Promise<IndexInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT
        i.relname as name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1 AND t.relkind = 'r'
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
      ORDER BY i.relname`,
    [tableName]
  );

  return result.rows.map((row) => ({
    name: row.name as string,
    columns: row.columns as string[],
    unique: row.is_unique as boolean,
    primary: row.is_primary as boolean,
  }));
}

// SQLite schema fetcher functions
function fetchSqliteTables(connection: DatabaseConnection): TableInfo[] {
  const db = new Database(connection.database);
  
  try {
    const rows = db.prepare(`
      SELECT name, type 
      FROM sqlite_master 
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string; type: string }>;
    
    return rows.map((row) => ({
      name: row.name,
      type: row.type === 'view' ? 'view' : 'table',
    }));
  } finally {
    db.close();
  }
}

function fetchSqliteColumns(connection: DatabaseConnection, tableName: string): ColumnDefinition[] {
  const db = new Database(connection.database);
  
  try {
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;
    
    // Get foreign keys
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
    }>;
    
    // Get table schema to check for AUTOINCREMENT keyword
    const schemaResult = db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName) as { sql: string } | undefined;
    const tableSchema = schemaResult?.sql?.toUpperCase() || '';
    const hasAutoincrement = tableSchema.includes('AUTOINCREMENT');
    
    const fkMap = new Map(foreignKeys.map((fk) => [fk.from, { table: fk.table, column: fk.to }]));
    
    return columns.map((col) => {
      // In SQLite, INTEGER PRIMARY KEY columns auto-increment by default (rowid alias)
      // If AUTOINCREMENT keyword is present, it's explicitly auto-incrementing
      const isIntegerPrimaryKey = col.pk === 1 && 
        col.type.toUpperCase() === 'INTEGER';
      const isAutoIncrement = isIntegerPrimaryKey || 
        (col.pk === 1 && hasAutoincrement);
      
      return {
        name: col.name,
        type: col.type || 'unknown',
        nullable: col.notnull === 0,
        defaultValue: col.dflt_value || undefined,
        isPrimaryKey: col.pk === 1,
        isForeignKey: fkMap.has(col.name),
        autoIncrement: isAutoIncrement,
        references: fkMap.get(col.name),
      };
    });
  } finally {
    db.close();
  }
}

function fetchSqliteIndexes(connection: DatabaseConnection, tableName: string): IndexInfo[] {
  const db = new Database(connection.database);

  try {
    const indexes = db.prepare(`PRAGMA index_list("${tableName}")`).all() as Array<{
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>;

    return indexes.map((idx) => {
      const indexInfo = db.prepare(`PRAGMA index_info("${idx.name}")`).all() as Array<{
        seqno: number;
        cid: number;
        name: string;
      }>;

      return {
        name: idx.name,
        columns: indexInfo.map((col) => col.name),
        unique: idx.unique === 1,
        primary: idx.origin === 'pk',
      };
    });
  } finally {
    db.close();
  }
}

// Foreign Key fetching functions
async function fetchMySqlForeignKeys(
  connection: DatabaseConnection,
  tableName: string
): Promise<ForeignKeyInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT
        CONSTRAINT_NAME as constraint_name,
        COLUMN_NAME as column_name,
        REFERENCED_TABLE_NAME as referenced_table,
        REFERENCED_COLUMN_NAME as referenced_column
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
    [connection.database, tableName]
  );

  return result.rows.map((row) => ({
    constraintName: row.constraint_name as string,
    columnName: row.column_name as string,
    referencedTable: row.referenced_table as string,
    referencedColumn: row.referenced_column as string,
  }));
}

async function fetchPostgresForeignKeys(
  connection: DatabaseConnection,
  tableName: string
): Promise<ForeignKeyInfo[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1`,
    [tableName]
  );

  return result.rows.map((row) => ({
    constraintName: row.constraint_name as string,
    columnName: row.column_name as string,
    referencedTable: row.referenced_table as string,
    referencedColumn: row.referenced_column as string,
  }));
}

function fetchSqliteForeignKeys(
  connection: DatabaseConnection,
  tableName: string
): ForeignKeyInfo[] {
  const db = new Database(connection.database);

  try {
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
    }>;

    return foreignKeys.map((fk) => ({
      constraintName: `fk_${tableName}_${fk.from}`,
      columnName: fk.from,
      referencedTable: fk.table,
      referencedColumn: fk.to,
    }));
  } finally {
    db.close();
  }
}

// Fetch all relationships in the database
async function fetchMySqlAllRelationships(connection: DatabaseConnection): Promise<TableRelationship[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT
        TABLE_NAME as from_table,
        COLUMN_NAME as from_column,
        REFERENCED_TABLE_NAME as to_table,
        REFERENCED_COLUMN_NAME as to_column
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME`,
    [connection.database]
  );

  return result.rows.map((row) => ({
    fromTable: row.from_table as string,
    fromColumn: row.from_column as string,
    toTable: row.to_table as string,
    toColumn: row.to_column as string,
  }));
}

async function fetchPostgresAllRelationships(connection: DatabaseConnection): Promise<TableRelationship[]> {
  const poolManager = getPoolManager();
  const result = await poolManager.executeQuery(
    connection,
    `SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name`
  );

  return result.rows.map((row) => ({
    fromTable: row.from_table as string,
    fromColumn: row.from_column as string,
    toTable: row.to_table as string,
    toColumn: row.to_column as string,
  }));
}

function fetchSqliteAllRelationships(connection: DatabaseConnection): TableRelationship[] {
  const db = new Database(connection.database);

  try {
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>;

    const relationships: TableRelationship[] = [];

    for (const table of tables) {
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${table.name}")`).all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }>;

      for (const fk of foreignKeys) {
        relationships.push({
          fromTable: table.name,
          fromColumn: fk.from,
          toTable: fk.table,
          toColumn: fk.to,
        });
      }
    }

    return relationships;
  } finally {
    db.close();
  }
}
