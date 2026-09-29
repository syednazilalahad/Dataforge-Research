import { database } from '../src/lib/db';
await database();
console.log('Database migrations applied.');
process.exit(0);
