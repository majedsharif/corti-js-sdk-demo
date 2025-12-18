// Corti SDK Authentication & Client Setup

import dotenv from 'dotenv';
dotenv.config();

// If using custom CA certificates
if (process.env.NODE_EXTRA_CA_CERTS) {
  console.log('Using CA certificates from:', process.env.NODE_EXTRA_CA_CERTS);
}

import fetch from 'node-fetch';
globalThis.fetch = fetch;
globalThis.Headers = fetch.Headers;
globalThis.Request = fetch.Request;
globalThis.Response = fetch.Response;

import { CortiClient } from '@corti/sdk';

// Validate environment variables
const requiredEnvVars = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_NAME', 'ENVIRONMENT'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('Missing environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Initialize Corti SDK
let corti;
try {
  corti = new CortiClient({
    auth: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    },
    tenantName: process.env.TENANT_NAME,
    environment: process.env.ENVIRONMENT
  });
  console.log('Corti SDK initialized');
} catch (err) {
  console.error('Failed to initialize Corti SDK:', err.message);
  process.exit(1);
}

export default corti;