// Main Server Entry Point

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';

// Import modules
import corti from './cortiClient.js';
import { handleAmbientConnection } from './ambientStream.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    environment: process.env.ENVIRONMENT,
    tenantName: process.env.TENANT_NAME 
  });
});

// ============================================
// Templates API
// ============================================

// List available templates
app.get('/api/templates', async (req, res) => {
  try {
    console.log('Fetching templates...');
    const response = await corti.templates.list();
    console.log('Templates fetched:', response?.templates?.length || 0);
    res.json(response);
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates', details: err.message });
  }
});

// Get specific template by key
app.get('/api/templates/:key', async (req, res) => {
  try {
    const { key } = req.params;
    console.log(`Fetching template: ${key}`);
    const response = await corti.templates.get(key);
    res.json(response);
  } catch (err) {
    console.error('Failed to fetch template:', err);
    res.status(500).json({ error: 'Failed to fetch template', details: err.message });
  }
});

// ============================================
// Documents API
// ============================================

// List documents for an interaction
app.get('/api/interactions/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Listing documents for interaction: ${id}`);
    const response = await corti.documents.list(id);
    res.json(response);
  } catch (err) {
    console.error('Failed to list documents:', err);
    res.status(500).json({ error: 'Failed to list documents', details: err.message });
  }
});

// Create document from transcript or facts
app.post('/api/interactions/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { context, templateKey, outputLanguage, name } = req.body;

    console.log(`Creating document for interaction: ${id}`);
    console.log('Request body:', JSON.stringify({ templateKey, outputLanguage, name, contextType: context?.[0]?.type }));

    // Validate required fields
    if (!context || !Array.isArray(context) || context.length === 0) {
      return res.status(400).json({ error: 'Context is required and must be a non-empty array' });
    }
    if (!templateKey) {
      return res.status(400).json({ error: 'templateKey is required' });
    }
    if (!outputLanguage) {
      return res.status(400).json({ error: 'outputLanguage is required' });
    }

    const response = await corti.documents.create(id, {
      context,
      templateKey,
      outputLanguage,
      name: name || 'Generated Document'
    });

    console.log('Document created successfully:', response?.id);
    res.json(response);
  } catch (err) {
    console.error('Failed to create document:', err);
    res.status(500).json({ error: 'Failed to create document', details: err.message });
  }
});

// Get specific document
app.get('/api/interactions/:id/documents/:documentId', async (req, res) => {
  try {
    const { id, documentId } = req.params;
    console.log(`Fetching document ${documentId} for interaction: ${id}`);
    const response = await corti.documents.get(id, documentId);
    res.json(response);
  } catch (err) {
    console.error('Failed to fetch document:', err);
    res.status(500).json({ error: 'Failed to fetch document', details: err.message });
  }
});

// Delete document
app.delete('/api/interactions/:id/documents/:documentId', async (req, res) => {
  try {
    const { id, documentId } = req.params;
    console.log(`Deleting document ${documentId} for interaction: ${id}`);
    await corti.documents.delete(id, documentId);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete document:', err);
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const pathname = req.url;
  console.log(`WebSocket connection attempt to: ${pathname}`);

  if (pathname === '/ws/ambient') {
    handleAmbientConnection(ws);
  } else {
    console.log(`Unknown WebSocket path: ${pathname}`);
    ws.close(4004, 'Unknown endpoint');
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Start server
const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws/ambient`);
  console.log(`Environment: ${process.env.ENVIRONMENT}`);
  console.log(`Tenant: ${process.env.TENANT_NAME}\n`);
});