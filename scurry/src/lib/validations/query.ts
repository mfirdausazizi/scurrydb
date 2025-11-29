import { z } from 'zod';

// Query size limits
export const MAX_QUERY_SIZE = 1024 * 1024; // 1MB
export const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * SQL query validation schema
 */
export const queryExecuteSchema = z.object({
  sql: z
    .string()
    .min(1, 'SQL query is required')
    .max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE / 1024}KB`),
  connectionId: z
    .string()
    .uuid('Invalid connection ID'),
  teamId: z
    .string()
    .uuid('Invalid team ID')
    .optional()
    .nullable(),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(10000, 'Limit must be at most 10,000')
    .optional()
    .default(1000),
});

/**
 * Query save schema
 */
export const querySaveSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .trim(),
  sql: z
    .string()
    .min(1, 'SQL query is required')
    .max(MAX_QUERY_SIZE, `Query must be at most ${MAX_QUERY_SIZE / 1024}KB`),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional()
    .nullable(),
  connectionId: z
    .string()
    .uuid('Invalid connection ID'),
  teamId: z
    .string()
    .uuid('Invalid team ID')
    .optional()
    .nullable(),
  isPublic: z
    .boolean()
    .optional()
    .default(false),
});

export type QueryExecuteInput = z.infer<typeof queryExecuteSchema>;
export type QuerySaveInput = z.infer<typeof querySaveSchema>;

/**
 * Validates content-type header for JSON requests
 */
export function validateContentType(request: Request): { valid: boolean; error?: string } {
  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    return { valid: false, error: 'Content-Type header is required' };
  }
  
  if (!contentType.includes('application/json')) {
    return { valid: false, error: 'Content-Type must be application/json' };
  }
  
  return { valid: true };
}

/**
 * Validates content-length header for size limits
 */
export function validateContentLength(
  request: Request, 
  maxSize: number = MAX_REQUEST_BODY_SIZE
): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSize) {
      return { 
        valid: false, 
        error: `Request body too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validates SQL query for basic safety patterns
 * Note: This is NOT a substitute for parameterized queries!
 */
export function validateQueryPattern(sql: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const upperSql = sql.toUpperCase();
  
  // Check for multiple statements (potential SQL injection)
  const statementCount = (sql.match(/;/g) || []).length;
  if (statementCount > 1) {
    warnings.push('Query contains multiple statements. Only the first statement will be executed.');
  }
  
  // Check for dangerous operations without WHERE clause
  if (/^\s*(DELETE\s+FROM|UPDATE)\s+\w+\s*$/i.test(sql.trim())) {
    warnings.push('Query modifies all rows. Consider adding a WHERE clause.');
  }
  
  // Check for DROP/TRUNCATE without confirmation
  if (/^\s*(DROP|TRUNCATE)\s+/i.test(sql)) {
    warnings.push('Query performs a destructive operation. This action cannot be undone.');
  }
  
  return { valid: true, warnings };
}
