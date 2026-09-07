const http = require('node:http');

const port = Number(process.env.PORT || 3000);

const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');

  if (request.url === '/health') {
    response.writeHead(200);
    response.end(JSON.stringify({
      service: 'api',
      status: 'ok',
      dependencies: {
        postgres: process.env.POSTGRES_HOST,
        redis: process.env.REDIS_HOST,
        elasticsearch: process.env.ELASTICSEARCH_URL,
      },
    }));
    return;
  }

  response.writeHead(200);
  response.end(JSON.stringify({ service: 'api', message: 'KanchaYA API en desarrollo' }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
});
