import { neon } from '@neondatabase/serverless';

let sqlInstance: any = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  if (!sqlInstance) {
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  
  return sqlInstance;
}

// Create a function that can be used as a tagged template literal
const sqlFunction = function sql(strings: TemplateStringsArray, ...values: any[]) {
  return getSql()(strings, ...values);
};

// Add properties dynamically
Object.defineProperty(sqlFunction, 'query', {
  get() {
    return getSql().query;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(sqlFunction, 'unsafe', {
  get() {
    return getSql().unsafe;
  },
  enumerable: false,
  configurable: true,
});

Object.defineProperty(sqlFunction, 'transaction', {
  get() {
    return getSql().transaction;
  },
  enumerable: false,
  configurable: true,
});

export const sql = sqlFunction as ReturnType<typeof neon>;

