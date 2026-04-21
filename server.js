const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const fp = path.join(__dirname, url);
  const ext = path.extname(fp);
  const ct = MIME[ext] || 'application/octet-stream';

  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + url);
      return;
    }
    res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
