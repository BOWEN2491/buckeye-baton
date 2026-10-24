import { database, setup, closeDatabase } from '../src/server/db';
import { seed } from '../src/server/seed';
async function main() {const db=await database();await setup(db);await seed(db);console.log(`Database ready (${db.mode}).`);await closeDatabase();}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
