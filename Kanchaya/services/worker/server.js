const http = require('node:http');

const port = Number(process.env.PORT || 3001);
let jobsProcessed = 0;

setInterval(() => {
  jobsProcessed += 1;
  console.log(`Worker heartbeat; jobs processed: ${jobsProcessed}`);
}, 30000).unref();

const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');

  if (request.url === '/health') {
    response.writeHead(200);
    response.end(JSON.stringify({ service: 'worker', status: 'ok', jobsProcessed }));
    return;
  }

  response.writeHead(200);
  response.end(JSON.stringify({ service: 'worker', message: 'KanchaYA worker en desarrollo' }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Worker listening on port ${port}`);
});
