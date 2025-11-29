/**
 * Dangerous Query Detector
 * 
 * Detects potentially destructive SQL queries that could cause data loss.
 * Used to prompt users for confirmation before executing dangerous operations.
 */

export type DangerLevel = 'critical' | 'warning' | 'safe';

export type DangerType = 
  | 'drop_table' 
  | 'drop_database' 
  | 'drop_index'
  | 'truncate' 
  | 'delete_all' 
  | 'update_all'
  | 'alter_table'
  | null;

export interface DangerousQueryInfo {
  isDangerous: boolean;
  level: DangerLevel;
  type: DangerType;
  affectedObject?: string; // Table or database name
  message: string;
  requiresConfirmation: boolean;
  requiresTypingToConfirm: boolean; // For critical operations, require typing the name
}

interface DangerPattern {
  pattern: RegExp;
  type: DangerType;
  level: DangerLevel;
  getMessage: (match: RegExpMatchArray) => string;
}

const DANGEROUS_PATTERNS: DangerPattern[] = [
  // DROP DATABASE - Critical
  {
    pattern: /^\s*DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*;?\s*$/i,
    type: 'drop_database',
    level: 'critical',
    getMessage: (match) => `This will permanently delete the entire database "${match[1]}" and all its data.`,
  },
  // DROP TABLE - Critical
  {
    pattern: /^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*;?\s*$/i,
    type: 'drop_table',
    level: 'critical',
    getMessage: (match) => `This will permanently delete the table "${match[1]}" and all its data.`,
  },
  // DROP multiple tables
  {
    pattern: /^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(.+)\s*;?\s*$/i,
    type: 'drop_table',
    level: 'critical',
    getMessage: (match) => `This will permanently delete the table(s): ${match[1]}.`,
  },
  // TRUNCATE TABLE - Critical
  {
    pattern: /^\s*TRUNCATE\s+(?:TABLE\s+)?[`"']?(\w+)[`"']?\s*;?\s*$/i,
    type: 'truncate',
    level: 'critical',
    getMessage: (match) => `This will delete ALL rows from "${match[1]}". This cannot be rolled back.`,
  },
  // DROP INDEX - Warning
  {
    pattern: /^\s*DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?[`"']?(\w+)[`"']?/i,
    type: 'drop_index',
    level: 'warning',
    getMessage: (match) => `This will drop the index "${match[1]}", which may affect query performance.`,
  },
  // DELETE without WHERE clause - Warning
  {
    pattern: /^\s*DELETE\s+FROM\s+[`"']?(\w+)[`"']?\s*;?\s*$/i,
    type: 'delete_all',
    level: 'warning',
    getMessage: (match) => `This will delete ALL rows from "${match[1]}" (no WHERE clause).`,
  },
  // DELETE with WHERE 1=1 or similar - Warning
  {
    pattern: /^\s*DELETE\s+FROM\s+[`"']?(\w+)[`"']?\s+WHERE\s+(?:1\s*=\s*1|true)\s*;?\s*$/i,
    type: 'delete_all',
    level: 'warning',
    getMessage: (match) => `This will delete ALL rows from "${match[1]}" (WHERE clause always true).`,
  },
  // UPDATE without WHERE clause - Warning
  {
    pattern: /^\s*UPDATE\s+[`"']?(\w+)[`"']?\s+SET\s+[^;]+(?:;?\s*$)/i,
    type: 'update_all',
    level: 'warning',
    getMessage: (match) => {
      // Check if there's a WHERE clause
      const hasWhere = /\bWHERE\b/i.test(match[0]);
      if (!hasWhere) {
        return `This will update ALL rows in "${match[1]}" (no WHERE clause).`;
      }
      return '';
    },
  },
  // ALTER TABLE with DROP COLUMN - Warning
  {
    pattern: /^\s*ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+DROP\s+(?:COLUMN\s+)?[`"']?(\w+)[`"']?/i,
    type: 'alter_table',
    level: 'warning',
    getMessage: (match) => `This will permanently remove column "${match[2]}" from table "${match[1]}".`,
  },
];

/**
 * Detects if a SQL query is potentially dangerous
 */
export function detectDangerousQuery(sql: string): DangerousQueryInfo {
  // Normalize the SQL (trim and collapse whitespace for better matching)
  const normalizedSql = sql.trim();
  
  // Check for empty query
  if (!normalizedSql) {
    return {
      isDangerous: false,
      level: 'safe',
      type: null,
      message: '',
      requiresConfirmation: false,
      requiresTypingToConfirm: false,
    };
  }

  // Try each pattern
  for (const { pattern, type, level, getMessage } of DANGEROUS_PATTERNS) {
    const match = normalizedSql.match(pattern);
    if (match) {
      const message = getMessage(match);
      
      // Skip if getMessage returns empty string (e.g., UPDATE with WHERE)
      if (!message) continue;
      
      // Extract the affected object name for confirmation typing
      let affectedObject = match[1];
      if (affectedObject) {
        // Remove quotes and backticks
        affectedObject = affectedObject.replace(/[`"']/g, '');
      }

      return {
        isDangerous: true,
        level,
        type,
        affectedObject,
        message,
        requiresConfirmation: true,
        requiresTypingToConfirm: level === 'critical',
      };
    }
  }

  // No dangerous pattern matched
  return {
    isDangerous: false,
    level: 'safe',
    type: null,
    message: '',
    requiresConfirmation: false,
    requiresTypingToConfirm: false,
  };
}

/**
 * Check if a query contains multiple statements (potential for hidden dangerous queries)
 */
export function containsMultipleStatements(sql: string): boolean {
  // Simple check for semicolons not at the end
  const trimmed = sql.trim();
  const withoutTrailingSemicolon = trimmed.endsWith(';') 
    ? trimmed.slice(0, -1).trim() 
    : trimmed;
  return withoutTrailingSemicolon.includes(';');
}

/**
 * Get display information for the danger level
 */
export function getDangerLevelInfo(level: DangerLevel): {
  color: string;
  bgColor: string;
  icon: 'alert-triangle' | 'alert-circle' | 'info';
  title: string;
} {
  switch (level) {
    case 'critical':
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/50',
        icon: 'alert-triangle',
        title: 'Critical - Irreversible Operation',
      };
    case 'warning':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/50',
        icon: 'alert-circle',
        title: 'Warning - Potentially Destructive',
      };
    default:
      return {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/30',
        icon: 'info',
        title: 'Information',
      };
  }
}
