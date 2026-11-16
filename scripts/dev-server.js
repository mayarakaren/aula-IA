// Servidor local pra testar (imita a Vercel). Uso: npm run dev   (senha do painel: teste)
process.env.HOST_PASSWORD = process.env.HOST_PASSWORD || 'teste';
const http = require('http'); const fs = require('fs'); const path = require('path');
const PUBLIC = path.join(__dirname, '..', 'public');
const routes = { '/api/state': require('../api/state.js'), '/api/play': require('../api/play.js'), '/api/host': require('../api/host.js') };
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const h = routes[url.pathname];
  if (h) {
    let raw = ''; for await (const ch of req) raw += ch;
    req.body = raw ? JSON.parse(raw) : {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return h(req, res);
  }
  let f = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!path.extname(f)) f += '.html';
  const file = path.join(PUBLIC, path.normalize(f).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
}).listen(process.env.PORT || 3000, () => {
  const port = process.env.PORT || 3000;
  console.log('\nServidor rodando (dados na memória, somem ao parar):');
  console.log('  Alunos:     http://localhost:' + port);
  console.log('  Professora: http://localhost:' + port + '/professora   (senha: ' + process.env.HOST_PASSWORD + ')\n');
});
