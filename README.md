# Corti JavaScript SDK Demo

A simple demo application showcasing Corti's ambient scribe capabilities for healthcare documentation, including live transcription, clinical fact extraction (FactsR™), and SOAP note generation using the JavaScript SDK. The SDK simplifies integration by handling WebSocket management, authentication, and message parsing. This means more focus on building your application rather than managing connections.

Use this demo as a reference to understand how the SDK works and accelerate your own Corti-powered integrations.

This sample app demonstrates:

- **Voice Streaming**: Real-time audio capture and streaming via WebSocket connection
- **Transcription**: Speech-to-text conversion during patient encounters
- **FactsR™ Clinical Reasoning**: Automatic fact extraction of structured medical data (chief complaint, vitals, medications, allergies, etc.)
- **Document Generation**: Generate SOAP notes from extracted facts in 10+ languages


![Corti JavaScript SDK Demo UI Overview](assets/demo-ui.png)

## What the SDK Does For You

The [Corti JavaScript SDK](https://www.npmjs.com/package/@corti/sdk) (`@corti/sdk`) simplifies integration by handling:

- **WebSocket management**: Connection lifecycle, reconnection logic, and message parsing
- **Authentication**: OAuth token handling and automatic refresh
- **Type safety**: Full TypeScript support with typed requests and responses
- **API abstraction**: Clean methods for interactions, streaming, documents, and templates

Instead of manually managing WebSocket connections and authentication, you can do the following:

```javascript
import { CortiClient } from '@corti/sdk';

const corti = new CortiClient({
  auth: { clientId: '...', clientSecret: '...' },
  tenantName: 'your-tenant',
  environment: 'us'
});

// Connect to streaming
const stream = await corti.stream.connect({ id: interactionId, configuration });

// Listen for transcripts and facts
stream.on('message', (msg) => {
  if (msg.type === 'transcript') { /* handle transcript */ }
  if (msg.type === 'facts') { /* handle extracted facts */ }
});

// Send audio
stream.sendAudio(audioData);
```

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** version 18.0.0 or higher ([download](https://nodejs.org))
- **npm** typically included with Node.js or yarn ([download](https://www.npmjs.com))
- **Corti JavaScript SDK** run `npm install @corti/sdk`
- **Corti API credentials**: See the "Getting Corti Credentials" section below and check out Corti's [Authentication Guide](https://docs.corti.ai/authentication/overview) for more information
- Any modern browser with microphone access (Chrome, Firefox, Edge, Safari, etc.)

## Demo App Architecture Overview

```plaintext
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Microphone    │  │   Transcript    │  │   Document      │  │
│  │   Recording     │  │   + Facts UI    │  │   Generation    │  │
│  └────────┬────────┘  └────────▲────────┘  └────────┬────────┘  │
│           │                    │                    │           │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │ Audio (WebSocket)  │ Results            │ REST API
            ▼                    │                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend (Node.js)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ WebSocket       │  │  Corti SDK      │  │  REST API       │  │
│  │ /ws/ambient     │──│  Integration    │──│  /api/*         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘  │
│           │                    │                                │
└───────────┼────────────────────┼────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Corti API                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  /stream        │  │  /interactions  │  │  /documents     │  │
│  │  (WebSocket)    │  │  (REST)         │  │  (REST)         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## General Project Structure

```plaintext
corti-sdk-demo/
│
├── src/                         # React frontend application
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Global styles
│   └── components/
│       ├── AmbientDocumentation.tsx  # Recording & facts UI
│       └── DocumentGeneration.tsx    # SOAP note generation
│
├── backend/                     # Node.js server
│   ├── server.js                # Express server + WebSocket
│   ├── cortiClient.js           # Corti SDK initialization
│   ├── ambientStream.js         # Streaming handler
│   ├── package.json
│   └── .env                     # Your credentials (create this)
│
├── package.json                 # Frontend dependencies
├── vite.config.ts
└── README.md
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/majedsharif/corti-js-sdk-demo.git
cd corti-js-sdk-demo
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
# Corti API Credentials (required)
CLIENT_ID=your-client-id-here
CLIENT_SECRET=your-client-secret-here
TENANT_NAME=your-tenant-name
ENVIRONMENT=us

# Server Configuration (optional)
PORT=5005
```

#### Environment Variables

| Variable        | Required | Description                          | Example              |
| --------------- | -------- | ------------------------------------ | -------------------- |
| `CLIENT_ID`     | Yes      | Your Corti API client ID             | `abc123-def456-...`  |
| `CLIENT_SECRET` | Yes      | Your Corti API client secret         | `secret_xyz789...`   |
| `TENANT_NAME`   | Yes      | Your organization's tenant name      | `acme-health`        |
| `ENVIRONMENT`   | Yes      | Corti region: `us`, `eu`, or `dev`   | `us`                 |
| `PORT`          | No       | Backend server port (default: 5005)  | `5005`               |

### 3. Set Up the Frontend

From the project root directory:

```bash
cd ..
npm install
```

### 4. Start the Application

You'll need two terminal windows.

**Terminal 1: Start the backend:**

```bash
cd backend
npm run dev
```

For example, you should see output similar to:

```plaintext
Corti SDK initialized
Server running on http://localhost:5005
WebSocket available at ws://localhost:5005/ws/ambient
Environment: us
Tenant: your-tenant-name
```

**Terminal 2: Start the frontend (from project root):**

```bash
npm run dev
```

For example, you should see output similar to:

```plaintext
VITE vX.X.X  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 5. Open the Application

Open the Local URL shown in your terminal.

> **Note:** The exact port numbers may vary depending on your system. Always use the URLs displayed in your terminal output.

## Getting Corti Credentials

1. Log in to the [Corti Console](https://console.corti.app)
2. Navigate to **Settings** → **API Credentials**
3. Click **Create API Client** (or use an existing one)
4. Copy the following values:
   - **Client ID** → `CLIENT_ID`
   - **Client Secret** → `CLIENT_SECRET`
5. Find your **Tenant Name** in the console URL or account settings → `TENANT_NAME`
6. Note your **Region** (`us` or `eu`) → `ENVIRONMENT`

> **Security Note:** Never commit your `.env` file or expose credentials in client-side code.

## Usage Guide

### Recording a Session

1. Click the **microphone button** to start recording
2. Grant microphone permissions when prompted
3. Speak naturally: the transcript appears in over time on the left
4. Clinical facts are extracted and displayed on the right
5. Click the **stop button** when finished

### Generating Documents

1. Complete a recording session (facts must be extracted)
2. Select an **output language** from the dropdown
3. Click **Generate** to create a SOAP note
4. View the formatted document or switch to JSON view
5. Download the document as JSON if needed

## API Reference

### REST Endpoints

| Method   | Endpoint                                   | Description                              |
| -------- | ------------------------------------------ | ---------------------------------------- |
| `GET`    | `/api/health`                              | Health check (verify server is running)  |
| `GET`    | `/api/templates`                           | List available document templates        |
| `GET`    | `/api/templates/:key`                      | Get a specific template by key           |
| `POST`   | `/api/interactions/:id/documents`          | Generate a document                      |
| `GET`    | `/api/interactions/:id/documents`          | List documents for an interaction        |
| `GET`    | `/api/interactions/:id/documents/:docId`   | Get a specific document                  |
| `DELETE` | `/api/interactions/:id/documents/:docId`   | Delete a document                        |

### WebSocket Endpoint

| Endpoint                 | Description                                             |
| ------------------------ | --------------------------------------------------------|
| `ws://{host}/ws/ambient` | Audio streaming for transcription & fact extraction     |

#### WebSocket Message Types

**Client → Server:**

- Binary audio data (WebM/Opus format)
- `{ "type": "flush" }` Force process buffered audio
- `{ "type": "end" }` End the session

**Server → Client:**

- `{ "type": "session_started", "interactionId": "..." }`
- `{ "type": "CONFIG_ACCEPTED" }`
- `{ "type": "transcript", "data": { "text": "...", "isFinal": true } }`
- `{ "type": "facts", "data": [{ "text": "...", "group": "chief-complaint" }] }`
- `{ "type": "ended" }`
- `{ "type": "error", "message": "..." }`

## Troubleshooting

### "Connection error. Make sure the backend is running."

**Cause:** The frontend can't connect to the backend server.

**Solutions:**

1. Ensure the backend is running (check Terminal 1)
2. Check the backend terminal for errors
3. Verify the backend port matches what the frontend expects (default: 5005)
4. Verify no firewall is blocking localhost connections

### "Failed to access microphone"

**Cause:** Browser doesn't have microphone permissions.

**Solutions:**

1. Click the lock/info icon in the browser address bar
2. Allow microphone access for localhost
3. Ensure no other application is using the microphone
4. Try a different browser

### No transcript appearing

**Cause:** Audio isn't being sent or processed correctly.

**Solutions:**

1. Check the backend terminal for Corti API errors
2. Verify your API credentials in `.env`
3. Ensure your tenant has access to the streaming API
4. Speak clearly and at a normal volume

### "Configuration denied" or authentication errors

**Cause:** Invalid or expired Corti credentials.

**Solutions:**

1. Regenerate credentials in the Corti Console
2. Double-check `TENANT_NAME` matches exactly (case-sensitive)
3. Verify `ENVIRONMENT` matches your account region

### Facts not extracting or appearing slowly

**Cause:** The conversation may not contain recognizable clinical content, or not enough context has been provided yet.

**Solutions:**

1. Try speaking sample clinical phrases: "The patient is a 45-year-old male presenting with chest pain for two days. Pain is sharp, rated 6 out of 10."
2. Speak continuous clinical content for at least 30-60 seconds to give Corti enough context
3. Check that transcripts are working first—if transcripts appear, facts will follow
4. Review backend logs for `Corti message: facts` entries

> **Note:** Transcript data is sent more periodically, while fact extraction takes slightly longer as Corti's AI needs to analyze context and structure clinical information. Facts will appear progressively during longer sessions.

## Development

### Running in Development Mode

Both servers support hot-reload:

```bash
# Backend (auto-restarts on file changes)
cd backend && npm run dev

# Frontend (hot module replacement, from project root)
npm run dev
```

### Building for Production

```bash
# Build frontend (from project root)
npm run build

# Start backend in production
cd backend && npm start
```

### Code Style

- Frontend: TypeScript + React with ESLint
- Backend: ES Modules (Node.js)

```bash
# Lint frontend (from project root)
npm run lint
```

## Tech Stack

| Layer      | Technology                                                    |
| ---------- | ------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite                                    |
| Backend    | Node.js, Express, WebSocket (ws)                              |
| API Client | [@corti/sdk](https://www.npmjs.com/package/@corti/sdk)        |
| Audio      | Web Audio API, MediaRecorder                                  |

## Resources

- [Corti](https://www.corti.ai/)
- [Corti Console](https://console.corti.app)
- [Corti SDK on npm](https://www.npmjs.com/package/@corti/sdk)
- [Corti API Documentation](https://docs.corti.ai)
- Support: [help@corti.ai](mailto:help@corti.ai)
