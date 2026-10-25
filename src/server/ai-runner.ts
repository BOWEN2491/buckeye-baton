import { database } from './db';
import { recoverAIJobs, runAnalysisStep } from './ai-jobs';
const store=globalThis as typeof globalThis & {buckeyeAIRunner?:{stopped:boolean;timer:ReturnType<typeof setTimeout>|null;recovered:boolean}};
export const INTERVAL_MS=5000;
export async function runAICheck(){return runAnalysisStep();}
export function startAIRunner(intervalMs=INTERVAL_MS,check:()=>Promise<unknown>=runAICheck){if(store.buckeyeAIRunner)return store.buckeyeAIRunner;const state={stopped:false,timer:null as ReturnType<typeof setTimeout>|null,recovered:false};store.buckeyeAIRunner=state;const loop=async()=>{if(state.stopped)return;try{if(!state.recovered){await recoverAIJobs(await database());state.recovered=true;}if(!state.stopped)await check();}catch(error){console.error('[ai] check failed; retrying',error instanceof Error?error.name:'Error');}finally{if(!state.stopped)state.timer=setTimeout(()=>void loop(),intervalMs);}};void loop();return state;}
export function stopAIRunner(){const state=store.buckeyeAIRunner;if(state){state.stopped=true;if(state.timer)clearTimeout(state.timer);delete store.buckeyeAIRunner;}}
