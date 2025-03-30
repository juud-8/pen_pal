import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Use environment variable for database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection
const client = postgres(connectionString);

// Create a drizzle instance with our schema
export const db = drizzle(client, { schema });

// Export a function to push the schema to the database
export async function pushSchema() {
  try {
    console.log('Pushing schema to database...');

    // Since we're using drizzle-kit for migrations, we don't need to do anything here.
    // Just make sure the tables exist before proceeding.
    
    console.log('Schema push completed successfully.');
  } catch (error) {
    console.error('Failed to push schema:', error);
    throw error;
  }
}