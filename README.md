# Personal Gemini Journal 📔✨

> **Built for the Google Cloud Run Social Challenge**  
> *Category:* AI Application on Cloud Run  
> *Hashtag:* `#AccelerateAIwithCloudRun`

**Personal Gemini Journal** is an authenticated personal life and memory journal powered by Google Gemini and Cloud Firestore, designed to run on Google Cloud Run. It transforms daily reflections into connected life insights across goals, reading, music, moods, milestones, and memories — with a dedicated **"Ask My Journal"** multi-turn AI reasoning engine.

---

## 📌 Ideathon Evaluator Quick-Start & Testing

Evaluators and reviewers can test all application features easily:

- **Interactive Sign-In:** Sign up with any valid email and password to create an isolated personal workspace, or click the **"Use Ideathon Demo Account"** quick-fill button on the sign-in screen to instantly evaluate pre-configured workflows.
- **Data Isolation:** Every account generates an isolated Firestore document hierarchy scoped strictly to its Firebase Auth UID.

---

## 🌟 Core Architecture & Challenge Requirements

Personal Gemini Journal satisfies the four foundational challenge pillars:

### 1. 🔐 Robust Authentication (Firebase Auth)
- Built on Firebase Authentication for user identity.
- No plaintext password storage; all sessions resolve to a trusted Firebase UID.
- Full session persistence with motivational quotes on login/logout.

### 2. 🧠 Multi-Turn Gemini AI ("Ask My Journal")
- **Grounding in User Life Data:** Unlike generic AI chatbots, Ask My Journal queries your real, authorized life records (journals, goals, reading library, music tracks, mood history, calendar events) to answer questions such as:
  > *"What was I worried about last month?"*  
  > *"How do my music soundtracks connect to my mood?"*  
  > *"What progress have I made toward my F1 circuit goals?"*
- **Fail-Closed Privacy & Source Attribution:** Private and PIN-locked entries are excluded from AI prompts by default. Every response includes clickable source attribution chips linking back to canonical records.
- **Server-Side AI Proxy:** Gemini interactions route securely through Express (`/api/gemini/*`) using the modern Google GenAI TypeScript SDK (`@google/genai`) with an automated model fallback cascade (`gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-3.8-flash`).

### 3. 🛡️ Isolated Firestore Data Storage
- All personal data is strictly isolated under user-scoped paths:
  ```
  /users/{uid}/journals/{journalId}
  /users/{uid}/goals/{goalId}
  /users/{uid}/memories/{memoryId}
  /users/{uid}/books/{bookId}
  /users/{uid}/music/{musicId}
  /users/{uid}/moods/{moodId}
  /users/{uid}/calendar/{eventId}
  /users/{uid}/settings/{settingsDoc}
  ```
- **Deployed Firestore Security Rules:** Client requests from unauthorized UIDs are rejected at the database level (`request.auth.uid == userId`). No user can read, query, or mutate another user's records.

### 4. 🔑 Secure Secret Management
- Zero API keys are exposed to the client or browser bundle.
- The Gemini API key is accessed exclusively in Node.js server-side code (`server.ts`) via `process.env.GEMINI_API_KEY`.
- In Cloud Run, credentials can be injected directly as environment variables or backed by **Google Cloud Secret Manager**.

---

## 🗺️ The Life Connections Engine

Rather than maintaining disconnected feature silos, Personal Gemini Journal utilizes a **Life Connections Engine**:

```
                 📔 Journal Entry
                        │
                        ▼
               Gemini AI Orchestrator
                        │
                        ▼
             Life Connections Engine
                        │
       ┌────────┬───────┼───────┬────────┐
       ▼        ▼       ▼       ▼        ▼
     Goals    Books   Music  Calendar   Mood
       │        │       │       │        │
       └────────┴───────┼───────┴────────┘
                        │
                        ▼
               3D Memory Carousel
                        │
                        ▼
               🧠 Ask My Journal
```

- **Canonical Data Model:** Entities are deduplicated by title and canonical identity. Mentioning a book or goal across multiple journals links to the existing record instead of creating duplicate records.
- **Human in Control:** AI suggests new goals, calendar events, or reading items, but consequential permanent creations require user confirmation.

---

## 🚀 Application Workspaces

| Workspace | Description |
| :--- | :--- |
| **🏠 Home & Journal** | Rich journal editor with mood tagging, custom categories, photo attachments, voice-to-text, and SHA-256 PIN locking. |
| **🧠 Ask My Journal** | Multi-turn conversational AI grounded strictly in your personal records, complete with suggested prompts and source citations. |
| **🎯 Goal Journey** | F1-inspired circuit map tracking milestones, progress percentages, and completion timestamps. |
| **✨ 3D Memories** | Three.js WebGL memory carousel and spherical continuum with Firestore persistence and image attachments. |
| **📊 Mood Journey** | Emotional telemetry monitoring Mood, Energy, Stress, and Confidence with interactive visual charts. |
| **📚 Digital Library** | Reading progress tracker, status management, book reflections, and quotes. |
| **🎵 Music Memories** | Personal soundtrack manager linking songs to moods and life moments. |
| **📅 Calendar** | Event and task scheduling connected directly to journal activities. |
| **⚙️ Settings & Security** | Master PIN management, granular AI permission toggles, data export, and account controls. |

---

## 🛠️ Local Development & Build

### Prerequisites
- Node.js 20+
- npm 10+
- A valid Gemini API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file based on `.env.example`:
```bash
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Start Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
This compiles the Vite frontend into `dist/` and bundles `server.ts` into `dist/server.cjs` via esbuild.

### 5. Production Start
```bash
npm start
```

---

## ☁️ Google Cloud Run Deployment

To deploy this application to Google Cloud Run, execute the following commands using the Google Cloud SDK (`gcloud`):

### 1. Build and Deploy Container
```bash
gcloud run deploy personal-gemini-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "NODE_ENV=production" \
  --update-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --labels "dev-tutorial=cloud-run-ai-challenge"
```

> **Mandatory Challenge Label:** The deployment command includes the required label `--labels "dev-tutorial=cloud-run-ai-challenge"`.

---

## 🔒 Security & Threat Modeling

- **Strict Input Validation:** All API endpoints validate request payloads, sanitize prompts, and enforce length bounds.
- **Indirect Prompt Injection Protection:** User journal content is treated as untrusted data within system instruction boundaries so entries cannot hijack AI system prompts.
- **PIN Integrity:** Master PIN is hashed using client-side SHA-256 (`window.crypto.subtle`) before evaluation. The raw PIN is never stored or transmitted to the AI.
- **Fail-Safe AI Permissions:** Users can independently revoke AI access to any data stream (Journals, Goals, Books, Music, Calendar, Mood) at any time in Settings.

---

## 📄 License & Attribution

Developed for the Google Cloud Run Social Challenge utilizing Google AI Studio, Google Cloud Run, Cloud Firestore, and Google Gemini API.
