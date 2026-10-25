import type { Sql } from '../src/server/db';
import { sourceHash } from '../src/server/recommendations';
import type { Expertise } from '../src/shared/p5-types';
import { repositoryHash, type SourceSnapshot } from '../src/server/github';

export const validIntroduction = { sentences: ['A fictional student prototype with a React interface and PostgreSQL persistence.'], topics: ['front-end', 'database'], technologies: ['typescript', 'react', 'postgresql'] };
export const modelResponse = (value: unknown) => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: typeof value === 'string' ? value : JSON.stringify(value) }] }] });
export const commit = '0123456789abcdef0123456789abcdef01234567';
export function githubResponse(value: string): Response {
 const url = new URL(value); const parts = url.pathname.split('/').filter(Boolean);
 if (parts.length === 3) return Response.json({ size: 10, description: 'Fictional React TypeScript PostgreSQL student prototype.', private: false, default_branch: 'main' });
 if (parts[3] === 'commits') return Response.json({ sha: commit });
 if (parts[3] === 'languages') return Response.json({ TypeScript: 2000, JavaScript: 500 });
 const file = parts[3] === 'readme' ? 'README.md' : parts.slice(4).join('/');
 const text = file === 'README.md' ? '# Fictional project\nReact interface with TypeScript and PostgreSQL; planned tests are not completed.' : file === 'package.json' ? JSON.stringify({ dependencies: { react: '19', pg: '8' }, devDependencies: { typescript: '5' } }) : null;
 return text ? Response.json({ type: 'file', path: file, encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64') }) : Response.json({ message: 'Not Found' }, { status: 404 });
}

// Explicit mock evidence only, for existing invitation tests; production hash and public projection
// still validate these rows. No live GitHub read or model generation is claimed.
export async function confirmedTopics(sql: Sql, id: string, topics: Expertise[]) {
 const project = (await sql.query('SELECT * FROM projects WHERE id=$1', [id])).rows[0] as Record<string, any>;
 const sources: SourceSnapshot['sources'] = { repoUrl: project.codeUrl || `https://github.com/example/mock-${id}`, commit, readAt: new Date().toISOString(), files: [{ path: 'README.md', truncated: false }], missingREADME: false, evidence: 'mock' };
 const snapshot: SourceSnapshot = { sources, description: 'Fictional mock source fixture.', languages: [], files: [{ path: 'README.md', text: 'Fictional source fixture only; no live read.' }], cacheOrigin: 'mock-fixture' };
 await sql.query('INSERT INTO github_source_cache ("repoUrl",snapshot,"expiresAt") VALUES ($1,$2,clock_timestamp()+interval \'5 minutes\') ON CONFLICT ("repoUrl") DO UPDATE SET snapshot=EXCLUDED.snapshot,"expiresAt"=EXCLUDED."expiresAt"', [sources.repoUrl, JSON.stringify(snapshot)]);
 const published = { version: 5, sourceHash: sourceHash(project), repositoryHash: repositoryHash(snapshot), sentences: ['Fictional mock evidence for invitation testing.'], topics, technologies: [], tags: topics, reviewedAt: new Date().toISOString(), sources };
 await sql.query('INSERT INTO project_introductions ("projectId",published) VALUES ($1,$2) ON CONFLICT ("projectId") DO UPDATE SET published=EXCLUDED.published', [id, JSON.stringify(published)]);
}
