// Isolated GitHub REST stand-in. Never reads a token or accesses the network.
import { createServer } from 'node:http';
const port = Number(process.argv[2] || 3200);
const commit = '0123456789abcdef0123456789abcdef01234567';
createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  const send = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (!parts.length) { send({ mock: true }); return; }
  const repo = parts[2] || '';
  if (repo === 'missing') { send({ message: 'Not Found' }, 404); return; }
  if (repo === 'rate-limited') { res.setHeader('x-ratelimit-remaining', '0'); res.setHeader('retry-after', '1'); send({ message: 'Rate limit' }, 429); return; }
  if (parts.length === 3) { send({ size: 10, description: 'Fictional TypeScript React PostgreSQL student prototype.', default_branch: 'main', private: false, html_url: `https://github.com/${parts[1]}/${repo}` }); return; }
  if (parts[3] === 'commits') { send({ sha: commit, commit: { tree: { sha: commit } } }); return; }
  if (parts[3] === 'languages') { send({ TypeScript: 6000, JavaScript: 1000 }); return; }
  const file = parts[3] === 'readme' ? 'README.md' : parts.slice(4).join('/');
  if (file === 'README.md' && repo !== 'no-readme') { const text = '# Fictional project\nA React TypeScript prototype with PostgreSQL persistence; the team still needs user testing.'; send({ type: 'file', name: file, path: file, encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64') }); return; }
  if (file === 'package.json') { const text = JSON.stringify({ dependencies: { react: '19', pg: '8' }, devDependencies: { typescript: '5' } }); send({ type: 'file', path: file, encoding: 'base64', size: Buffer.byteLength(text), content: Buffer.from(text).toString('base64') }); return; }
  send({ message: 'Not Found' }, 404);
}).listen(port, '127.0.0.1');
