
async function main() {
  const API_URL = 'http://localhost:8787';
  const TOKEN = 'hunter2';

  console.log('--- 1. Initializing DOs ---');
  try {
    const res = await fetch(`${API_URL}/do/admin/initialize-dos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    console.log('Init Status:', res.status);
    const text = await res.text();
    console.log('Init Response:', text);
  } catch (e) {
    console.error('Init Failed:', e.message);
  }

  console.log('\n--- 2. Triggering Fetch for Source ID 1 ---');
  // We'll try source ID 1, 2, 3 just in case
  const sourceIds = [1, 2, 3, 4, 5]; 
  
  for (const id of sourceIds) {
      try {
        // The router maps /do/source/:sourceId/* -> DO fetch
        // DO handles /trigger
        const triggerUrl = `${API_URL}/do/source/${id}/trigger`;
        console.log(`Triggering ID ${id}...`);
        const res = await fetch(triggerUrl, {
          method: 'POST', // DO fetch usually accepts any method but logic checks pathname. 
                          // dataSourceIngestorDO.ts checks url.pathname === '/trigger'. 
                          // It doesn't explicitly check method, but POST is safe.
          headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        console.log(`Trigger ID ${id} Status:`, res.status);
        console.log(`Trigger ID ${id} Response:`, await res.text());
      } catch (e) {
        console.error(`Trigger ID ${id} Failed:`, e.message);
      }
  }
}

main();
