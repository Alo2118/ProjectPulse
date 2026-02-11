/**
 * Data migration script: PostgreSQL → SQL Server
 * Reads all data from PostgreSQL and inserts into SQL Server.
 */

const { Pool } = require('pg');
const sql = require('mssql');

const PG_URL = 'postgresql://postgres:Medas000@localhost:5432/projectpulse';
const MSSQL_CONFIG = {
  server: '192.168.52.22',
  database: 'projectpulse',
  user: 'DBA',
  password: 'SQL',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Tables in dependency order (parents first)
const TABLES = [
  'users',
  'project_templates',
  'refresh_tokens',
  'projects',
  'tasks',
  'task_dependencies',
  'task_completions',
  'time_entries',
  'comments',
  'risks',
  'documents',
  'notifications',
  'audit_logs',
  'user_inputs',
  'weekly_reports',
  'notes',
  'attachments',
];

// Columns that were JSON in PostgreSQL and are now String in SQL Server
const JSON_COLUMNS = new Set([
  'tags', 'recurrence_pattern', 'old_data', 'new_data', 'metadata',
  'data', 'report_data', 'phases', 'structure', 'attachments',
]);

function convertValue(colName, value) {
  if (value === null || value === undefined) return null;
  // JSON objects/arrays need to be stringified for SQL Server String columns
  if (JSON_COLUMNS.has(colName) && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

async function main() {
  const pgPool = new Pool({ connectionString: PG_URL });
  const mssqlPool = await sql.connect(MSSQL_CONFIG);

  console.log('Connected to both databases.\n');

  // Step 1: Clear SQL Server tables (in reverse dependency order, keep _prisma_migrations)
  console.log('--- Clearing SQL Server tables ---');
  const reverseTables = [...TABLES].reverse();
  for (const table of reverseTables) {
    try {
      await mssqlPool.request().query(`DELETE FROM [${table}]`);
      console.log(`  Cleared: ${table}`);
    } catch (e) {
      console.log(`  Skip: ${table} (${e.message.slice(0, 60)})`);
    }
  }

  console.log('\n--- Migrating data ---');

  for (const table of TABLES) {
    // Read from PostgreSQL
    const pgResult = await pgPool.query(`SELECT * FROM ${table}`);
    let rows = pgResult.rows;

    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skip)`);
      continue;
    }

    // Sort tasks: parents first (null parent_task_id), then children
    if (table === 'tasks') {
      const parentFirst = rows.filter(r => !r.parent_task_id);
      const children = rows.filter(r => r.parent_task_id);
      rows = [...parentFirst, ...children];
    }

    const columns = Object.keys(rows[0]);

    // Insert into SQL Server in batches
    let inserted = 0;
    for (const row of rows) {
      const request = mssqlPool.request();
      const paramNames = [];

      columns.forEach((col, i) => {
        const paramName = `p${i}`;
        paramNames.push(`@${paramName}`);
        const value = convertValue(col, row[col]);

        // Handle different types
        if (value instanceof Date) {
          request.input(paramName, sql.DateTime2, value);
        } else if (typeof value === 'boolean') {
          request.input(paramName, sql.Bit, value);
        } else if (typeof value === 'number' && Number.isInteger(value)) {
          request.input(paramName, sql.Int, value);
        } else if (typeof value === 'number') {
          request.input(paramName, sql.Decimal(18, 2), value);
        } else if (value === null) {
          request.input(paramName, sql.NVarChar, null);
        } else {
          request.input(paramName, sql.NVarChar(sql.MAX), String(value));
        }
      });

      const colList = columns.map(c => `[${c}]`).join(', ');
      const paramList = paramNames.join(', ');

      try {
        await request.query(`INSERT INTO [${table}] (${colList}) VALUES (${paramList})`);
        inserted++;
      } catch (e) {
        console.error(`  ERROR on ${table}: ${e.message.slice(0, 120)}`);
        console.error(`    Row ID: ${row.id || 'N/A'}`);
      }
    }

    console.log(`  ${table}: ${inserted}/${rows.length} rows migrated`);
  }

  console.log('\n--- Migration complete! ---');

  await pgPool.end();
  await mssqlPool.close();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
