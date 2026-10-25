// Local stand-in for the OpenAI Responses endpoint, used only by Playwright. Not a real model.
import { createServer } from 'node:http';
const port = Number(process.argv[2] || 3199);
createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200); res.end('mock ok'); return; }
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    const body = JSON.parse(raw);
    const project = JSON.parse(body.input[1].content);
    const title = String(project.title).replace(/[.!?]/g, '');
    const content = { sentences: [`${title} is a fictional student project shared on Buckeye Baton.`, `This draft came from a local mock model in automated tests.`], tags: ['mock', String(project.status)] };
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'completed', model: body.model, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] }] }));
    }, 600);
  });
}).listen(port, '127.0.0.1');
