import { neon } from '@neondatabase/serverless';

let sqlInstance: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  if (!sqlInstance) {
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  
  return sqlInstance;
}

// Create a proxy that lazily initializes the SQL instance
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(_target, prop) {
    const sql = getSql();
    const value = (sql as any)[prop];
    if (typeof value === 'function') {
      return value.bind(sql);
    }
    return value;
  },
});

