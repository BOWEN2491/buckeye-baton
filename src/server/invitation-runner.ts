import { database } from './db';
import { dispatchInvitations, recordDispatchFailure } from './invitations';

// Automatic invitations for a continuously running Node server (see src/instrumentation.ts).
// Runs once on start, then 60 s after each check finishes, so checks never overlap. Any failure —
// including the database not being available yet — is contained and the next check is still
// scheduled. It reuses the process's database() singleton; correctness comes from the database lock
// and constraints, and the global flag only prevents this process from starting two timers.
type RunnerState = { started: boolean; timer: ReturnType<typeof setTimeout> | null; stopped: boolean };
const store = globalThis as { buckeyeInvitationRunner?: RunnerState; buckeyeInvitationOutageAt?: Date };
export const INTERVAL_MS = 60_000;

export async function runInvitationCheck() {
 let db: Awaited<ReturnType<typeof database>>;
 try {
  db = await database();
 } catch (error) {
  // Storage unavailable: nothing can be persisted now. Remember when, so status shows it once storage returns.
  store.buckeyeInvitationOutageAt ??= new Date();
  console.error('[invitations] database unavailable; will retry at the next check', error instanceof Error ? error.name : 'Error');
  return;
 }
 try {
  if (store.buckeyeInvitationOutageAt) {
   await recordDispatchFailure(db, store.buckeyeInvitationOutageAt);
   delete store.buckeyeInvitationOutageAt;
  }
  const result = await dispatchInvitations(db);
  console.log(`[invitations] check completed at ${result.at}: ${result.created} created`);
 } catch (error) {
  // Safe summary only; the failed transaction rolled back. The next scheduled check retries.
  console.error('[invitations] check failed', error instanceof Error ? error.name : 'Error');
  try { await recordDispatchFailure(db); } catch { /* storage unavailable; retry next interval */ }
 }
}

export function startInvitationRunner(intervalMs = INTERVAL_MS, check: () => Promise<void> = runInvitationCheck) {
 if (store.buckeyeInvitationRunner?.started) return store.buckeyeInvitationRunner;
 const state: RunnerState = { started: true, timer: null, stopped: false };
 store.buckeyeInvitationRunner = state;
 const loop = async () => {
  if (state.stopped) return;
  try {
   await check();
  } catch (error) {
   console.error('[invitations] check crashed', error instanceof Error ? error.name : 'Error');
  } finally {
   // Always schedule the next check unless stopped while this one was running.
   if (!state.stopped) state.timer = setTimeout(() => void loop(), intervalMs);
  }
 };
 console.log(`[invitations] automatic invitations enabled; checking every ${intervalMs / 1000} seconds`);
 void loop();
 return state;
}

export function stopInvitationRunner() {
 const state = store.buckeyeInvitationRunner;
 if (!state) return;
 state.stopped = true;
 if (state.timer) clearTimeout(state.timer);
 delete store.buckeyeInvitationRunner;
}
