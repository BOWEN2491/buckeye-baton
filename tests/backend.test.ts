import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { GET as projectGET } from '../src/app/api/projects/[id]/route';
import { GET as usersGET } from '../src/app/api/users/route';
import { POST as retiredAdoptionPOST } from '../src/app/api/lessons/[id]/adoptions/route';
import { PATCH as retiredAdoptionPATCH } from '../src/app/api/adoptions/[id]/route';
import './relay.test';
import './p2.test';
import './post-deletion.test';
import './p3.test';
import './p4.test';
import './p4-review.test';
import './p5.test';
import './p5-review.test';

async function request(resource: string, id?: string, method='GET', user?: string, body?: unknown, query='') {
 const req = new Request(`http://localhost/api/${resource}${query}`, {method,headers:{...(user?{'x-demo-user-id':user}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const response=await handle(req,resource,id); return {status:response.status,...await response.json()};
}
test('legacy discussion storage, retired adoption endpoints and project persistence', async () => {
 process.env.DATABASE_MODE='pglite'; process.env.PGLITE_DATA_DIR=await mkdtemp(path.join(tmpdir(),'pass-it-on-test-'));
 try {
  assert.equal((await request('health')).data.databaseMode,'pglite');
  assert.equal((await request('users')).data.length,4);
  assert.equal((await usersGET(new Request('http://localhost/api/users'))).status,200);
  const wrapper=await projectGET(new Request('http://localhost/api/projects/project-signup'),{params:Promise.resolve({id:'project-signup'})});assert.equal((await wrapper.json()).data.project.id,'project-signup');
  assert.equal((await request('projects',undefined,'GET',undefined,undefined,'?status=ongoing')).data.length,1);
  assert.equal((await request('projects',undefined,'GET',undefined,undefined,'?status=wrong')).status,400);
  assert.ok((await request('lessons',undefined,'GET',undefined,undefined,'?q=information')).data.some((lesson: {id:string})=>lesson.id==='lesson-fields'));
  const projectInput={title:'New project',summary:'A new project',courseOrClub:'OSU',term:'Fall 2026',codeUrl:'https://github.com/example/test-project',status:'ongoing'};
  assert.equal((await request('projects',undefined,'POST',undefined,projectInput)).status,401);
  assert.equal((await request('projects',undefined,'POST','staff-kevin',projectInput)).status,403);
  assert.equal((await request('project','project-signup','PATCH','student-mia',{status:'paused'})).status,403);
  const created=await request('projects',undefined,'POST','student-alex',projectInput);assert.equal(created.status,201);
  const lessonData={type:'worked',title:'A lesson',assumed:'Assumption',happened:'Observation',change:'Action',conditions:'Conditions',artifacts:[{label:'Evidence',url:'https://example.com'}]};
  const lesson=await request('projectLessons',created.data.id,'POST','student-alex',lessonData);assert.equal(lesson.status,201);
  assert.equal((await request('lesson',lesson.data.id,'PATCH','student-mia',{title:'Changed'})).status,403);
  assert.equal((await request('lesson',lesson.data.id,'PATCH','student-alex',{conditions:'Updated'})).status,200);
  assert.equal((await request('projectLessons',created.data.id,'POST','student-alex',{...lessonData,artifacts:[{label:'Bad',url:'javascript:alert(1)'}]})).status,400);
  const question=await request('comments',lesson.data.id,'POST','student-mia',{kind:'question',body:'Does this fit our event?'});assert.equal(question.status,201);
  assert.equal((await request('comments','lesson-fields','POST','student-mia',{kind:'reply',body:'Wrong lesson',parentId:question.data.id})).status,400);
  assert.equal((await request('referrals',undefined,'POST','student-mia',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Relevant expertise'})).status,403);
  assert.equal((await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'student-alex',reason:'Relevant expertise'})).status,400);
  const referral=await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Relevant expertise'});assert.equal(referral.status,201);
  assert.equal((await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Again'})).status,409);
  assert.equal((await request('referralReply',referral.data.id,'POST','student-alex',{body:'Advice'})).status,403);
  const concurrentReplies=await Promise.all([request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Test required fields with your users.'}),request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Duplicate concurrent reply.'})]);assert.deepEqual(concurrentReplies.map(r=>r.status).sort(),[201,409]);
  assert.equal((await request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Again'})).status,409);
  const discussion=await request('comments',lesson.data.id);assert.equal(discussion.data.referrals[0].status,'completed');assert.equal(discussion.data.comments.length,2);assert.equal(discussion.data.comments[1].author.id,'mentor-sarah');
  const retired=await request('adoptions',lesson.data.id,'POST','student-mia',{adoptingProjectId:'project-events'});
  assert.equal(retired.status,410);assert.equal(retired.error.code,'FEATURE_RETIRED');
  assert.equal((await request('adoption','missing','PATCH','student-mia',{result:'worked',note:'Retired'})).status,410);
  assert.equal((await request('adoptions','missing','POST')).status,410);
  const projectDetail=(await request('project',created.data.id)).data;
  assert.deepEqual(Object.keys(projectDetail).sort(),['lessons','project','source','successors']);
  assert.equal(projectDetail.lessons[0].id,lesson.data.id);
  assert.deepEqual(Object.keys((await request('lesson',lesson.data.id)).data).sort(),['lesson','project']);
  const storage=await database();
  assert.equal((await storage.query('SELECT * FROM adoptions')).rows.length,0);
  await storage.query('INSERT INTO adoptions (id,"lessonId","adoptingProjectId","authorId",result,note) VALUES ($1,$2,$3,$4,$5,$6)',['historic-adoption',lesson.data.id,'project-events','student-mia','worked','Historical result']);
  assert.equal((await request('adoption','historic-adoption','PATCH','student-mia',{result:'failed',note:'Must not write'})).status,410);
  assert.equal((await request('project',created.data.id,'PATCH','student-alex',{status:'paused',reflection:{whyPaused:'Project time ended.',ifAgain:['Plan a smaller first release.']}})).status,200);
  assert.equal((await request('lesson','missing')).status,404);
  const malformed=await handle(new Request('http://localhost/api/projects',{method:'POST',headers:{'x-demo-user-id':'student-alex'},body:'{'}),'projects');assert.equal(malformed.status,400);
  await closeDatabase();
  const preserved=(await (await database()).query('SELECT * FROM adoptions WHERE id=$1',['historic-adoption'])).rows[0];
  assert.equal(preserved.result,'worked');assert.equal(preserved.note,'Historical result');
  assert.equal((await request('comments',lesson.data.id)).data.comments.length,2);
  // Transaction rollback prevents partial writes.
  const db=await database();await assert.rejects(db.transaction(async sql=>{await sql.query('UPDATE projects SET title=$1 WHERE id=$2',['Never persist',created.data.id]);throw new Error('rollback');}));
  assert.equal((await request('project',created.data.id)).data.project.title,'New project');
 } finally {await closeDatabase();}
});

test('project reflections validate merged state, retain history and survive additive migrations', async () => {
 process.env.DATABASE_MODE='pglite'; process.env.PGLITE_DATA_DIR=await mkdtemp(path.join(tmpdir(),'buckeye-baton-v2-'));
 try {
  const input={title:'Reflection journey',summary:'Fictional test project',courseOrClub:'OSU',term:'Fall 2026',codeUrl:'https://github.com/example/test-project'};
  const created=await request('projects',undefined,'POST','student-alex',input);
  assert.equal(created.status,201); assert.equal(created.data.status,'ongoing');
  assert.deepEqual(created.data.reflection,{progress:'',outcomes:[],problems:[],nextTeam:'',whyPaused:'',ifAgain:[],reusable:[]});
  const id=created.data.id;
  assert.equal((await request('project',id,'PATCH','student-mia',{reflection:{progress:'Not mine'}})).status,403);
  assert.equal((await request('project',id,'PATCH','mentor-sarah',{reflection:{progress:'Not mine'}})).status,403);
  assert.equal((await request('project',id,'PATCH','student-alex',{status:'finished'})).status,400);
  assert.equal((await request('project',id)).data.project.status,'ongoing');
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:{progress:'Working prototype',outcomes:['Built the form']}})).status,200);
  const finished=await request('project',id,'PATCH','student-alex',{status:'finished',reflection:{nextTeam:'Test with your own users.'}});
  assert.equal(finished.status,200);assert.equal(finished.data.reflection.progress,'Working prototype');assert.deepEqual(finished.data.reflection.outcomes,['Built the form']);
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:{nextTeam:'  '}})).status,400);
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:{outcomes:[]}})).status,400);
  assert.equal((await request('project',id,'PATCH','student-alex',{status:'paused',reflection:{whyPaused:'Need more time'}})).status,400);
  const paused=await request('project',id,'PATCH','student-alex',{status:'paused',reflection:{whyPaused:'Need more time',ifAgain:['Scope smaller.'],reusable:[{label:'Source',url:'https://example.com/source'}]}});
  assert.equal(paused.status,200);assert.equal(paused.data.reflection.nextTeam,'Test with your own users.');
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:{reusable:[{label:'Unsafe',url:'javascript:alert(1)'}]}})).status,400);
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:null})).status,400);
  assert.equal((await request('project',id,'PATCH','student-alex',{reflection:{ifAgain:['  ']}})).status,400);
  assert.equal((await request('project',id,'PATCH','student-alex',{status:'ongoing'})).status,200);
  const edits=await Promise.all([request('project',id,'PATCH','student-alex',{reflection:{progress:'Reopened for testing'}}),request('project',id,'PATCH','student-alex',{reflection:{nextTeam:'Check keyboard navigation.'}})]);
  assert.ok(edits.every(edit=>edit.status===200));
  const merged=(await request('project',id)).data.project;
  assert.equal(merged.reflection.progress,'Reopened for testing');assert.equal(merged.reflection.nextTeam,'Check keyboard navigation.');
  assert.equal(merged.reflection.whyPaused,'Need more time');assert.deepEqual(merged.reflection.outcomes,['Built the form']);
  assert.equal((await request('projects',undefined,'POST','student-alex',{...input,status:'finished'})).status,400);
  assert.equal((await request('projects',undefined,'POST','student-alex',{...input,status:'paused',reflection:{whyPaused:'Time',ifAgain:['Start smaller']}})).status,201);
  assert.equal((await request('project','project-signup')).data.project.reflection,null);
  assert.equal((await request('project','project-signup','PATCH','student-alex',{title:'Legacy needs summary'})).status,400);
  const legacy=(await request('project','project-signup')).data.project;assert.equal(legacy.title,'Campus Signup');assert.equal(legacy.status,'finished');
  const question=await request('comments','lesson-fields','POST','student-mia',{kind:'question',body:'Keep this legacy question.'});
  const db=await database();
  await db.query('INSERT INTO adoptions (id,"lessonId","adoptingProjectId","authorId") VALUES ($1,$2,$3,$4)',['legacy-migration-adoption','lesson-fields','project-events','student-mia']);
  await setup(db);await setup(db);await seed(db);
  assert.equal((await request('project',id)).data.project.reflection.progress,'Reopened for testing');
  assert.equal((await request('project','project-signup')).data.project.reflection,null);
  assert.equal((await request('comments','lesson-fields')).data.comments[0].id,question.data.id);
  assert.equal((await (await database()).query('SELECT id FROM adoptions WHERE id=$1',['legacy-migration-adoption'])).rows[0].id,'legacy-migration-adoption');
  await closeDatabase();
  const restarted=(await request('project',id)).data.project;
  assert.deepEqual(restarted.reflection,merged.reflection);assert.equal(restarted.status,'ongoing');
  // Simulate a pre-v2 schema with real legacy rows, then apply the migration twice.
  const reopened=await database();await reopened.query('ALTER TABLE projects DROP COLUMN reflection');await setup(reopened);await setup(reopened);
  assert.equal((await request('project','project-signup')).data.project.reflection,null);
  assert.equal((await request('project','project-signup')).data.project.status,'finished');
  assert.equal((await request('comments','lesson-fields')).data.comments[0].id,question.data.id);
  assert.equal((await (await database()).query('SELECT id FROM adoptions WHERE id=$1',['legacy-migration-adoption'])).rows[0].id,'legacy-migration-adoption');
 } finally {await closeDatabase();}
});


test('retired adoption endpoints reject requests before opening database storage', async () => {
 const previousMode=process.env.DATABASE_MODE;const previousUrl=process.env.DATABASE_URL;
 try {
  await closeDatabase();process.env.DATABASE_MODE='pg';delete process.env.DATABASE_URL;
  const retired=await request('adoptions','lesson-fields','POST');
  assert.equal(retired.status,410);assert.equal(retired.error.code,'FEATURE_RETIRED');
  assert.equal((await request('adoption','old-record','PATCH')).status,410);
  const legacyPost=await retiredAdoptionPOST(new Request('http://localhost/api/lessons/lesson-fields/adoptions',{method:'POST'}),{params:Promise.resolve({id:'lesson-fields'})});
  const legacyPatch=await retiredAdoptionPATCH(new Request('http://localhost/api/adoptions/old-record',{method:'PATCH'}),{params:Promise.resolve({id:'old-record'})});
  assert.equal(legacyPost.status,410);assert.equal(legacyPatch.status,410);
  assert.equal((await legacyPost.json()).error.code,'FEATURE_RETIRED');
 } finally {
  if(previousMode===undefined)delete process.env.DATABASE_MODE;else process.env.DATABASE_MODE=previousMode;
  if(previousUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousUrl;
 }
});
