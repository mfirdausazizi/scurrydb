/**
 * SQL Importer
 * 
 * Provides utilities for parsing and executing SQL files.
 * Features:
 * - Statement parsing
 * - Transaction support
 * - Progress tracking
 * - Error handling
 */

export interface SQLImportOptions {
  stopOnError?: boolean;
  transactional?: boolean;
  delimiter?: string; // Statement delimiter (default: ';')
}

export interface SQLImportResult {
  totalStatements: number;
  executedStatements: number;
  errors: Array<{
    statement: string;
    error: string;
    statementIndex: number;
  }>;
  success: boolean;
}

export interface ParsedStatement {
  sql: string;
  startLine: number;
  endLine: number;
}

/**
 * Parse SQL file content into individual statements
 */
export function parseSQLStatements(
  sql: string,
  delimiter: string = ';'
): ParsedStatement[] {
  const statements: ParsedStatement[] = [];
  const lines = sql.split('\n');
  
  let currentStatement = '';
  let startLine = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inMultilineComment = false;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    if (currentStatement === '') {
      startLine = lineNum;
    }
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      // Handle string literals
      if (!inComment && !inMultilineComment) {
        if (!inString && (char === "'" || char === '"')) {
          inString = true;
          stringChar = char;
          currentStatement += char;
          continue;
        }
        
        if (inString) {
          currentStatement += char;
          if (char === stringChar) {
            // Check for escaped quote
            if (nextChar === stringChar) {
              currentStatement += nextChar;
              i++; // Skip next char
              continue;
            }
            inString = false;
          }
          continue;
        }
      }
      
      // Handle comments
      if (!inString && !inMultilineComment && char === '-' && nextChar === '-') {
        inComment = true;
        continue;
      }
      
      if (!inString && !inComment && char === '/' && nextChar === '*') {
        inMultilineComment = true;
        i++; // Skip *
        continue;
      }
      
      if (inMultilineComment && char === '*' && nextChar === '/') {
        inMultilineComment = false;
        i++; // Skip /
        continue;
      }
      
      if (inComment || inMultilineComment) {
        continue;
      }
      
      // Check for delimiter
      if (char === delimiter[0]) {
        const possibleDelimiter = line.slice(i, i + delimiter.length);
        if (possibleDelimiter === delimiter) {
          const trimmedStatement = currentStatement.trim();
          if (trimmedStatement) {
            statements.push({
              sql: trimmedStatement,
              startLine,
              endLine: lineNum,
            });
          }
          currentStatement = '';
          i += delimiter.length - 1;
          continue;
        }
      }
      
      currentStatement += char;
    }
    
    // End of line - reset single-line comment
    inComment = false;
    
    // Add newline if we're in the middle of a statement
    if (currentStatement) {
      currentStatement += '\n';
    }
  }
  
  // Handle any remaining statement (without trailing delimiter)
  const trimmedFinal = currentStatement.trim();
  if (trimmedFinal) {
    statements.push({
      sql: trimmedFinal,
      startLine,
      endLine: lines.length - 1,
    });
  }
  
  return statements;
}

/**
 * Validate SQL statements before execution
 */
export function validateSQLStatements(statements: ParsedStatement[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (statements.length === 0) {
    errors.push('No SQL statements found in the file');
    return { valid: false, errors, warnings };
  }
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    { pattern: /DROP\s+DATABASE/i, message: 'Contains DROP DATABASE statement' },
    { pattern: /TRUNCATE\s+TABLE/i, message: 'Contains TRUNCATE TABLE statement' },
  ];
  
  statements.forEach((stmt, index) => {
    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(stmt.sql)) {
        warnings.push(`Statement ${index + 1} (line ${stmt.startLine + 1}): ${message}`);
      }
    });
    
    // Check for common syntax issues
    if (stmt.sql.split('(').length !== stmt.sql.split(')').length) {
      warnings.push(`Statement ${index + 1} (line ${stmt.startLine + 1}): Unbalanced parentheses`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Preview SQL statements with syntax highlighting hints
 */
export function previewStatements(
  statements: ParsedStatement[],
  maxStatements: number = 10
): Array<{
  sql: string;
  type: 'select' | 'insert' | 'update' | 'delete' | 'create' | 'alter' | 'drop' | 'other';
  lineRange: string;
}> {
  return statements.slice(0, maxStatements).map(stmt => {
    const upperSql = stmt.sql.toUpperCase().trim();
    let type: 'select' | 'insert' | 'update' | 'delete' | 'create' | 'alter' | 'drop' | 'other' = 'other';
    
    if (upperSql.startsWith('SELECT')) type = 'select';
    else if (upperSql.startsWith('INSERT')) type = 'insert';
    else if (upperSql.startsWith('UPDATE')) type = 'update';
    else if (upperSql.startsWith('DELETE')) type = 'delete';
    else if (upperSql.startsWith('CREATE')) type = 'create';
    else if (upperSql.startsWith('ALTER')) type = 'alter';
    else if (upperSql.startsWith('DROP')) type = 'drop';
    
    return {
      sql: stmt.sql,
      type,
      lineRange: stmt.startLine === stmt.endLine 
        ? `Line ${stmt.startLine + 1}`
        : `Lines ${stmt.startLine + 1}-${stmt.endLine + 1}`,
    };
  });
}

/**
 * Read SQL file content
 */
export async function readSQLFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Estimate import time based on statement count
 */
export function estimateImportTime(statementCount: number): string {
  // Rough estimate: 50ms per statement
  const estimatedMs = statementCount * 50;
  
  if (estimatedMs < 1000) {
    return 'Less than a second';
  } else if (estimatedMs < 60000) {
    const seconds = Math.ceil(estimatedMs / 1000);
    return `About ${seconds} second${seconds > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.ceil(estimatedMs / 60000);
    return `About ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}
