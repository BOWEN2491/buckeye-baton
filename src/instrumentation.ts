export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs'||process.env.NEXT_PHASE==='phase-production-build')return;
 if(process.env.INVITATION_RUNNER_ENABLED==='1'){const {startInvitationRunner}=await import('./server/invitation-runner');startInvitationRunner();}
 if(process.env.AI_ANALYSIS_RUNNER_ENABLED==='1'){const {startAIRunner}=await import('./server/ai-runner');startAIRunner();}
}
