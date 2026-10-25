import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePreviewRuntime, preservedPreviewDirectory } from '../scripts/import-product-simulation';

const runtime = () => ({ port: 3001, url: 'http://127.0.0.1:3001', dataDirectory: preservedPreviewDirectory, appDirectory: 'C:/Users/23678/.codex/workspaces/buckeye-baton-p4-product-revision', aiEnvFile: 'C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.env.local', appSourceSha: '5a5fddfa527b2dff509431ad05bcaa36a8c7dc80' });

test('simulation importer accepts only the exact preserved preview identity before any connection', () => {
 assert.equal(validatePreviewRuntime(runtime()).port, 3001);
 assert.equal(validatePreviewRuntime({ ...runtime(), appDirectory: 'C:/Users/23678/.codex/workspaces/buckeye-baton-p5-implementation' }).port, 3001);
 const baseline = runtime();
 for (const changed of [
  { dataDirectory: preservedPreviewDirectory.replace('buckeye-baton-p4-review', 'buckeye-baton-p4-review-sibling') },
  { dataDirectory: `${preservedPreviewDirectory}/other-database` },
  { dataDirectory: 'D:/unrelated/buckeye-baton-p4-review/database' },
  { dataDirectory: '.data/p4-preview-e2e-737dae5553fa44779b0d1d0ce0ff3459' },
  { port: 3000 }, { port: '3001' }, { port: 9999 },
  { url: 'http://127.0.0.1:3000' },
  { appDirectory: `${baseline.appDirectory}-sibling` },
  { aiEnvFile: 'C:/another-project/.env.local' },
  { appSourceSha: 'unknown' },
 ]) assert.throws(() => validatePreviewRuntime({ ...baseline, ...changed }), /Unexpected preview manifest/, JSON.stringify(changed));
 for (const invalid of [null, undefined, [], {}, 'manifest']) assert.throws(() => validatePreviewRuntime(invalid), /Unexpected preview manifest/);
});
