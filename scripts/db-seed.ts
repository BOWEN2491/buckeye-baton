import { database, closeDatabase } from '../src/server/db';
import { seed } from '../src/server/seed';
async function main(){const db=await database();await seed(db);console.log('Demo seed ensured; existing data preserved.');await closeDatabase();}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
