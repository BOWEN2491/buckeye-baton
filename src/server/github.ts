import { createHash } from 'node:crypto';
import type { GitHubSources } from '../shared/p5-types';
import { normalizeGitHubUrl } from '../shared/p5-validation';
import type { Sql } from './db';
import { ApiFailure, rows } from './http';
import type { Transport } from './ai';
let transport: Transport = (url,init) => fetch(url,init);
export function setGitHubTransport(next: Transport | null) { transport = next ?? ((url,init)=>fetch(url,init)); }
export const setTransport = setGitHubTransport;
const manifests = ['package.json','pom.xml','requirements.txt','pyproject.toml','Cargo.toml','go.mod','build.gradle','Dockerfile'];
const LIMIT = 65536, FILE_LIMIT = 12000, TOTAL_LIMIT = 30000;
export interface SourceSnapshot { sources: GitHubSources; description: string; languages: string[]; files: {path:string;text:string}[]; cacheOrigin?: string }
// Identity covers every supplied source, excluding cache expiry and the time of the read.
export function repositoryHash(snapshot: SourceSnapshot): string {
 return createHash('sha256').update(JSON.stringify({repoUrl:snapshot.sources.repoUrl,commit:snapshot.sources.commit,evidence:snapshot.sources.evidence,description:snapshot.description,languages:[...snapshot.languages].sort(),files:snapshot.files.map(f=>({path:f.path,text:f.text})),sourceFiles:snapshot.sources.files,missingREADME:snapshot.sources.missingREADME})).digest('hex');
}
export async function currentRepositoryHash(sql:Sql,repoUrl:string,lock=false):Promise<string|null>{
 const row=(await rows(sql,`SELECT snapshot FROM github_source_cache WHERE "repoUrl"=$1${lock?' FOR SHARE':''}`,[repoUrl]))[0];
 return row?.snapshot?repositoryHash(row.snapshot):null;
}
const bad = () => new ApiFailure(502,'GITHUB_INVALID_RESPONSE','GitHub returned an unusable repository response.');
async function get(path: string, optional=false): Promise<any> {
 const base=(process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/,'');
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
 try {
  const response=await transport(`${base}${path}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Buckeye-Baton'},redirect:'error',signal:controller.signal});
  if(optional && response.status===404) return null;
  if(response.status===403 || response.status===429) throw new ApiFailure(429,'GITHUB_RATE_LIMITED','GitHub access is limited. Wait before retrying.');
  if(response.status===404) throw new ApiFailure(422,'GITHUB_NOT_PUBLIC','Repository not found or not public. Check the repository URL.');
  if(!response.ok) throw new ApiFailure(502,'GITHUB_UNAVAILABLE','GitHub is unavailable. Retry later.');
  if(Number(response.headers.get('content-length') || 0)>LIMIT) throw bad();
  const reader=response.body?.getReader(); if(!reader) throw bad(); let size=0; const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw bad();}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw bad();}
 }catch(e){if(e instanceof ApiFailure)throw e;throw new ApiFailure(502,'GITHUB_UNAVAILABLE','GitHub could not be read. Retry later.');}finally{clearTimeout(timer);}
}
export async function readGitHubSources(sql: Sql, value: string): Promise<SourceSnapshot> {
 const repoUrl=normalizeGitHubUrl(value); const cached=(await rows(sql,'SELECT snapshot FROM github_source_cache WHERE "repoUrl"=$1 AND "expiresAt">clock_timestamp()',[repoUrl]))[0]; if(cached && cached.snapshot.cacheOrigin===(process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/,'') && cached.snapshot.sources?.evidence === (process.env.GITHUB_API_BASE_URL?'mock':'github'))return cached.snapshot;
 const path=repoUrl.replace('https://github.com/','');const root=`/repos/${path}`; const metadata=await get(root);
 if(!metadata || metadata.private!==false || typeof metadata.default_branch!=='string' || !metadata.default_branch || !Number.isFinite(metadata.size) || metadata.size<0 || (metadata.description!==null && typeof metadata.description!=='string'))throw bad();
 const sources:GitHubSources={repoUrl,commit:null,readAt:new Date().toISOString(),files:[],missingREADME:true,evidence:process.env.GITHUB_API_BASE_URL?'mock':'github'};
 const snapshot:SourceSnapshot={sources,description:metadata.description??'',languages:[],files:[],cacheOrigin:(process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/,'')};
 // Empty repositories have no commit to resolve and must not claim files were fetched.
 if(metadata.size !== 0){
  const commit=await get(`${root}/commits/${encodeURIComponent(metadata.default_branch)}`);
  if(typeof commit?.sha!=='string'||!/^[a-fA-F0-9]{40}$/.test(commit.sha))throw bad();sources.commit=commit.sha;
  const languages=await get(`${root}/languages`);if(!languages||Array.isArray(languages)||typeof languages!=='object'||Object.values(languages).some(n=>typeof n!=='number'))throw bad();snapshot.languages=Object.keys(languages);
  const readFile=async(endpoint:string,expected?:string) => {const file=await get(endpoint,true);if(!file)return null;if(file.type!=='file'||file.encoding!=='base64'||typeof file.content!=='string'||typeof file.path!=='string'||typeof file.size!=='number'||!/^[A-Za-z0-9+/=\r\n]*$/.test(file.content)||file.path.includes('/')||file.path==='.'||file.path==='..'||(expected!==undefined&&file.path!==expected))throw bad();const encoded=file.content.replace(/[\r\n]/g,'');if(encoded.length%4!==0||Buffer.from(encoded,'base64').toString('base64')!==encoded)throw bad();const raw=Buffer.from(encoded,'base64').toString('utf8'); const remaining=Math.max(0,TOTAL_LIMIT-snapshot.files.reduce((n,f)=>n+f.text.length,0));const limit=Math.min(FILE_LIMIT,remaining);const text=Array.from(raw).slice(0,limit).join('');sources.files.push({path:file.path,truncated:raw.length>text.length||file.size>Buffer.byteLength(raw)});snapshot.files.push({path:file.path,text});return file;};
  sources.missingREADME=!(await readFile(`${root}/readme?ref=${sources.commit}`));
  let found=0;for(const name of manifests){if(found>=2)break;if(await readFile(`${root}/contents/${name}?ref=${sources.commit}`,name))found++;}
 }
 await sql.query('INSERT INTO github_source_cache ("repoUrl",snapshot,"expiresAt") VALUES ($1,$2,clock_timestamp()+interval \'5 minutes\') ON CONFLICT ("repoUrl") DO UPDATE SET snapshot=EXCLUDED.snapshot,"expiresAt"=EXCLUDED."expiresAt"',[repoUrl,JSON.stringify(snapshot)]);
 return snapshot;
}
export const readRepository = readGitHubSources;
