import pg from 'pg';

// Postgres caps a single statement at 65535 bind parameters.
const MAX_BIND_PARAMS = 60000;

export interface Db {
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  insert(table: string, columns: string[], rows: unknown[][]): Promise<number>;
  close(): Promise<void>;
}

/**
 * Thin pg wrapper used instead of Prisma for bulk writes.
 *
 * `createMany` validates and serialises every row through the query engine, which
 * caps out around 3k rows/sec — far too slow for a multi-month backfill. Multi-row
 * INSERT statements against the same database sustain ~27k rows/sec.
 */
export async function connect(connectionString: string): Promise<Db> {
  const client = new pg.Client({ connectionString });

  await client.connect();

  // Seed data is disposable, so durability of each individual commit does not matter.
  await client.query('set synchronous_commit = off');

  return {
    async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
      const result = await client.query(text, params);
      return result.rows as T[];
    },

    async insert(table: string, columns: string[], rows: unknown[][]): Promise<number> {
      if (rows.length === 0) {
        return 0;
      }

      const chunkSize = Math.max(1, Math.floor(MAX_BIND_PARAMS / columns.length));
      const columnList = columns.map(c => `"${c}"`).join(', ');

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const params: unknown[] = [];
        const values = chunk
          .map(row => `(${row.map(value => `$${params.push(value)}`).join(',')})`)
          .join(',');

        await client.query(`insert into ${table} (${columnList}) values ${values}`, params);
      }

      return rows.length;
    },

    async close(): Promise<void> {
      await client.end();
    },
  };
}
