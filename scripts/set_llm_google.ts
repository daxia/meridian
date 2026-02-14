import 'dotenv/config';
import { getApiToken } from './utils'; // Assume this exists or I'll implement a simple one

async function main() {
    const backendUrl = 'http://localhost:8787';
    const fs = await import('fs');
    const path = await import('path');
    const dotenv = await import('dotenv');
    
    const envPath = path.resolve(__dirname, '../apps/backend/.dev.vars');
    let token = '';
    
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        token = envConfig.API_TOKEN;
    } else {
        const dbEnvPath = path.resolve(__dirname, '../packages/database/.env');
        if (fs.existsSync(dbEnvPath)) {
             const envConfig = dotenv.parse(fs.readFileSync(dbEnvPath));
             token = envConfig.API_TOKEN;
        }
    }
    
    if (!token) {
        token = process.env.API_TOKEN || '';
    }

    if (!token) {
        console.error('❌ Could not find API_TOKEN');
        process.exit(1);
    }

    console.log('🔄 Reverting LLM provider to Google...');
    const updateRes = await fetch(`${backendUrl}/admin/settings`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'llm_provider': 'google',
            'llm_model': '' // Reset to default
        })
    });

    if (!updateRes.ok) {
        console.error('Failed to update settings:', await updateRes.text());
        return;
    }
    console.log('✅ Reverted to Google successfully');
}

main().catch(console.error);
