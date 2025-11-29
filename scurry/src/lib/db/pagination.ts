/**
 * Pagination Utilities
 * 
 * Provides cursor-based pagination for query results.
 * Supports automatic LIMIT/OFFSET injection and cursor encoding.
 */

export interface PaginationOptions {
  cursor?: string | null;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
  totalEstimate?: number;
}

export interface CursorData {
  offset: number;
  limit: number;
}

// Default page size
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 1000;

/**
 * Encode pagination cursor
 */
export function encodeCursor(offset: number, limit: number): string {
  const data: CursorData = { offset, limit };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * Decode pagination cursor
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(json) as CursorData;
    
    if (typeof data.offset !== 'number' || typeof data.limit !== 'number') {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Parse pagination options from request
 */
export function parsePaginationOptions(options: PaginationOptions): {
  offset: number;
  limit: number;
} {
  const limit = Math.min(options.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  
  if (options.cursor) {
    const cursorData = decodeCursor(options.cursor);
    if (cursorData) {
      return {
        offset: cursorData.offset + cursorData.limit, // Move to next page
        limit: Math.min(cursorData.limit, MAX_PAGE_SIZE),
      };
    }
  }
  
  return { offset: 0, limit };
}

/**
 * Check if a SQL query already has LIMIT clause
 */
export function hasLimitClause(sql: string): boolean {
  // Simple regex check - works for most cases
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  return /\blimit\s+\d+/i.test(normalizedSql);
}

/**
 * Check if a SQL query already has OFFSET clause
 */
export function hasOffsetClause(sql: string): boolean {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  return /\boffset\s+\d+/i.test(normalizedSql);
}

/**
 * Wrap a SELECT query with LIMIT and OFFSET for pagination
 * Only wraps if the query doesn't already have these clauses
 */
export function wrapQueryWithPagination(
  sql: string,
  limit: number,
  offset: number,
  dbType: 'mysql' | 'postgresql' | 'mariadb' | 'sqlite'
): string {
  const trimmedSql = sql.trim();
  
  // Don't wrap non-SELECT queries
  if (!trimmedSql.toLowerCase().startsWith('select')) {
    return trimmedSql;
  }
  
  // Don't wrap if already has LIMIT
  if (hasLimitClause(trimmedSql)) {
    return trimmedSql;
  }
  
  // Remove trailing semicolon for modification
  const sqlWithoutSemicolon = trimmedSql.replace(/;\s*$/, '');
  
  // All supported databases use the same LIMIT OFFSET syntax
  return `${sqlWithoutSemicolon} LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Create a COUNT query from a SELECT query (for total estimation)
 * Note: This is expensive for complex queries; use sparingly
 */
export function createCountQuery(sql: string): string | null {
  const trimmedSql = sql.trim().toLowerCase();
  
  // Only create count queries for simple SELECTs
  if (!trimmedSql.startsWith('select')) {
    return null;
  }
  
  // Remove existing LIMIT/OFFSET for count
  let countSql = sql.replace(/\blimit\s+\d+/gi, '').replace(/\boffset\s+\d+/gi, '');
  
  // Wrap in a subquery and count
  return `SELECT COUNT(*) as total FROM (${countSql.trim().replace(/;\s*$/, '')}) AS count_subquery`;
}

/**
 * Create paginated result from query data
 */
export function createPaginatedResult<T>(
  data: T[],
  offset: number,
  limit: number,
  totalEstimate?: number
): PaginatedResult<T> {
  const hasMore = data.length === limit;
  const nextCursor = hasMore ? encodeCursor(offset, limit) : null;
  
  return {
    data,
    cursor: nextCursor,
    hasMore,
    totalEstimate,
  };
}

/**
 * Extract limit from user query if present
 */
export function extractLimitFromQuery(sql: string): number | null {
  const match = sql.match(/\blimit\s+(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}
