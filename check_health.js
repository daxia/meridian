
const http = require('http');

const services = [
  { name: 'Frontend', url: 'http://127.0.0.1:3000/' },
  { name: 'Backend', url: 'http://127.0.0.1:8787/ping' },
  { name: 'ML Service', url: 'http://127.0.0.1:8000/docs' }
];

async function checkService(service) {
  return new Promise((resolve) => {
    console.log(`Checking ${service.name} at ${service.url}...`);
    const req = http.get(service.url, (res) => {
      console.log(`[OK] ${service.name} is up (Status: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (e) => {
      console.log(`[FAIL] ${service.name} is down: ${e.message}`);
      resolve(false);
    });
    
    // Set a short timeout
    req.setTimeout(3000, () => {
        req.destroy();
        console.log(`[TIMEOUT] ${service.name} timed out`);
        resolve(false);
    });
  });
}

async function main() {
  console.log('--- Health Check Start ---');
  const results = await Promise.all(services.map(checkService));
  console.log('--- Health Check End ---');
  
  if (results.every(r => r)) {
    console.log('✅ All services are operational.');
    process.exit(0);
  } else {
    console.log('❌ Some services are down.');
    process.exit(1);
  }
}

main();
