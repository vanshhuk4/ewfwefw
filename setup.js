#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Cybercrime Portal Backend Setup');
console.log('====================================\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Creating .env file from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please edit .env file with your actual values before starting the server.\n');
  } else {
    console.log('❌ env.example file not found!');
    console.log('Please create a .env file manually with the required environment variables.\n');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
  console.log('❌ Node.js version 16 or higher is required.');
  console.log(`Current version: ${nodeVersion}`);
  console.log('Please upgrade Node.js and try again.\n');
  process.exit(1);
} else {
  console.log(`✅ Node.js version ${nodeVersion} is compatible.\n`);
}

// Check if package.json exists
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.log('❌ package.json not found!');
  console.log('Please run this script from the backend directory.\n');
  process.exit(1);
}

console.log('📦 Checking dependencies...');
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('⚠️  node_modules not found. Please run: npm install\n');
} else {
  console.log('✅ Dependencies are installed.\n');
}

console.log('🔧 Setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env file with your actual values');
console.log('2. Ensure PostgreSQL is running and accessible');
console.log('3. Run: npm start');
console.log('\nFor help, see README.md or run: npm run help\n');
