import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './database/schema.js',
  dialect: 'mysql',
  dbCredentials: {
    database: process.env.MYSQL_DATABASE || 'bot',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    password: process.env.MYSQL_PASSWORD || '',
    user: process.env.MYSQL_USER,
  },
});
