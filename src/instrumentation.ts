// Next.js calls register() once per server instance. The invitation runner starts only in the Node.js
// runtime, only when INVITATION_RUNNER_ENABLED=1, and never during `next build`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.INVITATION_RUNNER_ENABLED !== '1') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { startInvitationRunner } = await import('./server/invitation-runner');
  startInvitationRunner();
}
