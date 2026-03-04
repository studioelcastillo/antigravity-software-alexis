import { execSync } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const env = process.argv[2] || 'staging';
const webhookUrl = process.env[`EASYPANEL_${env.toUpperCase()}_WEBHOOK`];

console.log(`🚀 Starting deployment to ${env.toUpperCase()}...`);

if (!webhookUrl && !process.argv.includes('--dry-run')) {
  console.error(`❌ Error: EASYPANEL_${env.toUpperCase()}_WEBHOOK environment variable is not defined.`);
  process.exit(1);
}

try {
  // 1. Set environment variable for Quasar build
  process.env.ENVIRONMENT = env;

  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('✅ Build completed successfully.');

  if (process.argv.includes('--dry-run')) {
    console.log('🧪 Dry run: Webhook trigger skipped.');
  } else {
    console.log(`🌐 Triggering Easypanel Webhook for ${env}...`);
    // Trigger the webhook (Easypanel webhooks are usually POST requests)
    await axios.post(webhookUrl);
    console.log('🚀 Deployment trigger sent successfully!');
  }

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
