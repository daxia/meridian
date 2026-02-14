import 'dotenv/config';
import { getApiToken } from './utils'; // Assume this exists or I'll implement a simple one

async function main() {
    const backendUrl = 'http://localhost:8787';
    // We need to implement getApiToken logic here if we can't import it easily
    // But wait, I can just use the token from .env if I load it
    
    // Let's try to find where getApiToken is defined or just read .env
    const fs = await import('fs');
    const path = await import('path');
    const dotenv = await import('dotenv');
    
    const envPath = path.resolve(__dirname, '../apps/backend/.dev.vars');
    let token = '';
    
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        token = envConfig.API_TOKEN;
    } else {
        // Try package/database/.env as fallback
        const dbEnvPath = path.resolve(__dirname, '../packages/database/.env');
        if (fs.existsSync(dbEnvPath)) {
             const envConfig = dotenv.parse(fs.readFileSync(dbEnvPath));
             token = envConfig.API_TOKEN;
        }
    }
    
    if (!token) {
        console.log('Checking process.env.API_TOKEN...');
        token = process.env.API_TOKEN || '';
    }

    if (!token) {
        console.error('❌ Could not find API_TOKEN');
        process.exit(1);
    }

    console.log('🔑 Using API Token:', token.substring(0, 5) + '...');

    // 1. Get current settings
    console.log('\n1️⃣  Getting current settings...');
    const getRes = await fetch(`${backendUrl}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!getRes.ok) {
        console.error('Failed to get settings:', await getRes.text());
        return;
    }
    
    const currentSettings = await getRes.json();
    console.log('Current Settings:', JSON.stringify(currentSettings, null, 2));

    // 2. Switch to GLM
    console.log('\n2️⃣  Switching to GLM...');
    const updateRes = await fetch(`${backendUrl}/admin/settings`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'llm_provider': 'glm',
            'llm_model': 'glm-4-flash',
            // 'llm_api_key': 'test-key' // Optional, not setting it to avoid messing up if they have env var
        })
    });

    if (!updateRes.ok) {
        console.error('Failed to update settings:', await updateRes.text());
        return;
    }
    console.log('✅ Update successful');

    // 3. Verify settings
    console.log('\n3️⃣  Verifying settings...');
    const verifyRes = await fetch(`${backendUrl}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const newSettings = await verifyRes.json();
    console.log('New Settings:', JSON.stringify(newSettings, null, 2));

    // 4. Revert to Google (Optional, but good to clean up)
    // console.log('\n4️⃣  Reverting to Google...');
    // ...
}

main().catch(console.error);
