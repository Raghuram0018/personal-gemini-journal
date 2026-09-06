import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedGeminiKey: string | null = null;
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (aiClient && cachedGeminiKey === key) {
    return aiClient;
  }
  try {
    aiClient = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    cachedGeminiKey = key;
    console.info('[Server] Gemini client initialized with live key.');
    return aiClient;
  } catch (err) {
    console.error('[Server] Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// Resilient model fallback cascade based on Gemini API skill guidelines
const CANDIDATE_MODELS = [
  'gemini-flash-latest',     // Stable high-limit flash model
  'gemini-3.1-flash-lite',   // High-speed, high-quota lite model
  'gemini-3.8-flash',        // Default for Basic Text Tasks
  'gemini-3.1-pro-preview',  // Complex task fallback
];

async function generateWithModelFallback(
  client: GoogleGenAI,
  prompt: string,
  options?: any
): Promise<string> {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          ...options,
        });
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || String(err)).toUpperCase();
        
        // Quota exhaustion check
        const isQuotaExhausted = errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('QUOTA');
        
        if (isQuotaExhausted) {
          // Break inner attempt loop to try next model in the CANDIDATE_MODELS list
          console.warn(`[Server] Model ${modelName} quota exhausted, trying next model...`);
          break; 
        }

        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('HIGH DEMAND') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('429');

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks exhausted');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // --- API Routes ---

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      application: 'Personal Gemini Journal',
      version: '1.0.0-foundation',
      timestamp: new Date().toISOString(),
      capabilities: {
        serverSideGemini: true,
        isolatedFirestore: true,
      },
    });
  });

  // Architectural Status endpoint
  app.get('/api/architecture/status', (_req: Request, res: Response) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    res.json({
      securityArchitecture: {
        dataIsolation: 'Isolated per-user collection: /users/{authenticatedUid}/...',
        apiBoundary: 'Strict Server-Side Proxy (Zero client exposure for secrets)',
        pinProtection: 'Client-side verification with cryptographic hash / no Gemini exposure',
        geminiConfigured: hasGeminiKey,
      },
      featuresRegistered: [
        'landing',
        'authentication',
        'dashboard',
        'journal',
        'ask-my-journal',
        'goals',
        'memories',
        'mood',
        'library',
        'calendar',
        'notifications',
        'motivation',
        'assistant',
      ],
    });
  });

  // Gemini Service Readiness endpoint
  app.get('/api/gemini/health', (_req: Request, res: Response) => {
    const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    res.json({
      service: 'Gemini AI Engine',
      ready: isConfigured,
      serverSideExecution: true,
      modelAlias: 'gemini-2.5-flash / fallback-cascade',
      groundingPolicy: 'User-Authorized Personal Journal Data Retrieval Only',
    });
  });

  // Smart Scheduling Endpoint for Calendar & Tasks
  app.post('/api/gemini/smart-schedule', async (req: Request, res: Response) => {
    try {
      const { query, existingEvents = [], existingTasks = [], existingGoals = [] } = req.body || {};
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const client = getGeminiClient();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      if (!client) {
        return res.json({
          suggestion: {
            title: query.length > 30 ? query.slice(0, 30) + '...' : query,
            date: tomorrowStr,
            startTime: '19:00',
            endTime: '20:00',
            description: `Suggested time slot for "${query}" based on optimal availability.`,
          },
        });
      }

      const prompt = `You are the Gemini Smart Scheduling Assistant for Personal Gemini Journal.
Analyze this scheduling request: "${query}"

Existing Events: ${JSON.stringify(existingEvents)}
Existing Tasks: ${JSON.stringify(existingTasks)}
Existing Goals: ${JSON.stringify(existingGoals)}

Task:
Find an optimal free time slot (avoiding overlap with existing events) for this request.
Return a suggested event JSON object in this format (no markdown code fences):
{
  "suggestion": {
    "title": "Clear concise event title",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "description": "Short reasoning for why this time slot was selected."
  }
}`;

      const responseText = await generateWithModelFallback(client, prompt);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch {
        return res.json({
          suggestion: {
            title: query.length > 30 ? query.slice(0, 30) + '...' : query,
            date: tomorrowStr,
            startTime: '19:00',
            endTime: '20:00',
            description: `Suggested time slot for "${query}".`,
          },
        });
      }
    } catch (err: any) {
      console.warn('[Server] Gemini smart schedule error:', err?.message);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return res.json({
        suggestion: {
          title: 'Scheduled Item',
          date: tomorrow.toISOString().split('T')[0],
          startTime: '19:00',
          endTime: '20:00',
          description: 'Scheduled via fallback availability assistant.',
        },
      });
    }
  });

  // Analyze Journal Entry with Gemini AI
  app.post('/api/gemini/analyze-journal', async (req: Request, res: Response) => {
    try {
      const { title, content, existingGoals = [], existingBooks = [] } = req.body || {};
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Journal content is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        const fallbackSummary = content.length > 120 ? content.slice(0, 120) + '...' : content;
        return res.json({
          summary: fallbackSummary,
          insights: ['Key milestone recorded', 'Reflective entry'],
          matchedGoalIds: [],
          matchedBookIds: [],
          detectedSuggestions: [],
          detectedEvents: [],
        });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const prompt = `You are the Life Connections Engine for Personal Gemini Journal.
Today's date is ${todayStr}.
Analyze this user journal entry:
Title: "${title || 'Untitled'}"
Content: "${content}"

User's existing goals: ${JSON.stringify(existingGoals)}
User's existing books: ${JSON.stringify(existingBooks.map((b: any) => ({ id: b.id, title: b.title, authors: b.authors })))}

Task:
1. Provide a concise 1-2 sentence summary.
2. Provide 2-3 key insights or emotional takeaways.
3. Automatically generate 2-4 short relevant tags (e.g. ["Career", "Learning", "Mindset"]) matching the entry topic.
4. Check if this entry explicitly relates to or provides progress on an EXISTING goal. If so, return its ID in "matchedGoalIds".
5. Check if this entry explicitly mentions or relates to an EXISTING book in the user's library. If so, return its ID in "matchedBookIds".
6. Check if ANY GOAL, AMBITION, TARGET, LEARNING OBJECTIVE, FITNESS GOAL, CAREER TARGET, or PROJECT INTENTION is specified in the journal entry (e.g., statements like "I want to become...", "I want to learn...", "My goal is...", "I aim to...", "I decided to build...", "Training for...", "Started studying...", "Target: ...", "Goal: ...", "Plan to master...", "Working towards...").
   If a goal is mentioned and NOT already present in existing goals, generate a rich new goal in "detectedSuggestions" with:
   - "type": "goal"
   - "title": Clean, concise goal title (e.g., "Become AI Agent Developer", "Run 10km Race", "Master Rust Systems Programming")
   - "description": Concrete summary of the objective and why it is being pursued
   - "category": One of "Career & Growth", "Learning & Skills", "Health & Wellness", "Finance & Wealth", "Mindfulness", "Creative Arts"
   - "milestones": Array of 4 progressive circuit checkpoints specifically engineered to achieve this exact goal!
     CRITICAL: EVERY checkpoint must have a UNIQUE, DOMAIN-SPECIFIC TITLE and ACTIONABLE DESCRIPTION directly tailored toward achieving this exact goal.
     NEVER use generic titles like "Foundation and Setup", "Core Execution", or "Final Mastery".
     Each checkpoint must include:
       - "title": Specific checkpoint name
       - "description": 1-2 sentence actionable description explaining how to pass this checkpoint
       - "targetDate": Estimated target completion date (YYYY-MM-DD)
       - "tasks": Array of 2-3 specific action items
7. Check if any NEW BOOKS or READING INTERESTS are mentioned. If so, generate a book suggestion in "detectedSuggestions" with "type": "book".
8. Check if any DATE/DAY/TIME EVENTS, EXAMS, MEETINGS, or APPOINTMENTS are specified in the journal entry (e.g., "interview on sep 15", "Doctor appointment next Monday at 10 AM", "Project presentation on Friday").
   If an event is mentioned, return an event item in "detectedEvents" with:
   - "title": Event title (e.g. "Data Analyst Interview")
   - "date": YYYY-MM-DD date string
   - "startTime": "HH:MM"
   - "description": "Scheduled from journal entry"

Return ONLY a valid JSON object in this format (no markdown code fences):
{
  "summary": "...",
  "insights": ["...", "..."],
  "suggestedTags": ["...", "..."],
  "matchedGoalIds": [],
  "matchedBookIds": [],
  "detectedSuggestions": [
    {
      "id": "sug_${Date.now()}",
      "type": "goal | book",
      "title": "Goal or Book title",
      "description": "Short description",
      "category": "Category",
      "milestones": [
        { "title": "Specific Name", "description": "...", "targetDate": "YYYY-MM-DD", "tasks": ["...", "..."] },
        ... (4 total)
      ]
    }
  ],
  "detectedEvents": [
    { "title": "...", "date": "...", "startTime": "...", "description": "..." }
  ]
}`;

      const responseText = await generateWithModelFallback(client, prompt);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      const extractFallbackTags = (text: string): string[] => {
        const tags: string[] = ['Journal'];
        const lower = text.toLowerCase();
        if (lower.includes('work') || lower.includes('job') || lower.includes('career') || lower.includes('project')) tags.push('Career');
        if (lower.includes('study') || lower.includes('learn') || lower.includes('code') || lower.includes('data') || lower.includes('sql') || lower.includes('exam')) tags.push('Learning');
        if (lower.includes('health') || lower.includes('workout') || lower.includes('run') || lower.includes('sleep')) tags.push('Wellness');
        if (lower.includes('goal') || lower.includes('future') || lower.includes('plan')) tags.push('Goals');
        if (lower.includes('grateful') || lower.includes('happy') || lower.includes('joy')) tags.push('Gratitude');
        if (lower.includes('read') || lower.includes('book') || lower.includes('library')) tags.push('Reading');
        if (tags.length === 1) tags.push('Reflection');
        return tags;
      };

      try {
        const parsed = JSON.parse(cleanJsonStr);
        if (!parsed.suggestedTags || !Array.isArray(parsed.suggestedTags) || parsed.suggestedTags.length === 0) {
          parsed.suggestedTags = extractFallbackTags(content);
        }
        return res.json(parsed);
      } catch {
        return res.json({
          summary: content.slice(0, 120) + '...',
          insights: ['Personal Reflection'],
          suggestedTags: extractFallbackTags(content),
          matchedGoalIds: [],
          matchedBookIds: [],
          detectedSuggestions: [],
          detectedEvents: [],
        });
      }
    } catch (err: any) {
      console.warn('[Server] Gemini journal analysis warning:', err?.message);
      const isQuota = (err?.message || '').includes('RESOURCE_EXHAUSTED') || (err?.message || '').includes('quota');
      const text = req.body?.content || '';
      return res.json({
        summary: text.slice(0, 120) + '...',
        insights: [isQuota ? 'AI is busy (limit reached)' : 'Entry saved'],
        suggestedTags: ['Journal', 'Reflection'],
        matchedGoalIds: [],
        matchedBookIds: [],
        detectedSuggestions: [],
        detectedEvents: [],
      });
    }
  });

function generateDomainCheckpoints(title: string, category: string = '', todayStr: string = '') {
  const t = (title || '').toLowerCase();
  const d = new Date(todayStr || Date.now());
  const addDays = (days: number) => {
    const target = new Date(d.getTime() + days * 86400000);
    return target.toISOString().slice(0, 10);
  };

  // 1. "Win Google Gen AI Hackathon" / Hackathon & Competitive Coding (Checked before general 'ai')
  if (t.includes('hackathon') || t.includes('contest') || t.includes('competition') || (t.includes('win') && t.includes('ai'))) {
    return [
      {
        title: 'Idea Validation, System Architecture & Challenge Specification',
        description: `Analyze judging rubrics, outline winning differentiators, and establish tech stack for ${title}.`,
        targetDate: addDays(7),
        tasks: ['Verify compliance with all hackathon criteria', 'Scaffold repository, CI/CD pipeline, and backend services']
      },
      {
        title: 'Build Core MVP with Gemini & Cloud Run Integration',
        description: 'Deliver the primary functional demo with secure authentication, API proxies, and persistent storage.',
        targetDate: addDays(18),
        tasks: ['Implement end-to-end user workflow', 'Connect Firebase Firestore and Gemini backend']
      },
      {
        title: 'Aesthetic Polish, Responsive Design & Rigorous QA',
        description: 'Eliminate UI bugs, refine typography and animations, and test all edge-case scenarios.',
        targetDate: addDays(28),
        tasks: ['Conduct comprehensive responsive UI test', 'Verify sub-second page load and zero console errors']
      },
      {
        title: 'Demo Video Production, Compelling Pitch & Final Submission',
        description: 'Record concise 3-minute video showcase, draft documentation, and submit to judges before deadline.',
        targetDate: addDays(35),
        tasks: ['Record high-definition video walkthrough', 'Submit official entry on hackathon portal']
      },
    ];
  }

  // 2. "Become CEO" / Executive Leadership & Startup Governance
  if (t.includes('ceo') || t.includes('leadership') || t.includes('executive') || t.includes('founder') || t.includes('chief executive')) {
    return [
      {
        title: 'Define Strategic Vision, Market Moat & Operating Philosophy',
        description: `Draft company mission, product-market fit metrics, and competitive differentiation for ${title}.`,
        targetDate: addDays(15),
        tasks: ['Draft company core value framework', 'Analyze competitor positioning and market gaps']
      },
      {
        title: 'Build High-Leverage Team & Operational Cadence',
        description: 'Recruit stellar leadership lieutenants and establish rigorous weekly executive review cycles.',
        targetDate: addDays(35),
        tasks: ['Implement OKR tracking framework', 'Design cross-functional communication cadence']
      },
      {
        title: 'Scale Revenue Engine, Unit Economics & Customer Retention',
        description: 'Optimize customer acquisition cost, improve net retention rate, and build enterprise pipeline.',
        targetDate: addDays(60),
        tasks: ['Review unit economics & churn metrics', 'Close 3 strategic enterprise lighthouse partners']
      },
      {
        title: 'Executive Board Governance & Long-Term Scaling',
        description: 'Lead shareholder meetings, align investor stakeholders, and cement sustainable market leadership.',
        targetDate: addDays(90),
        tasks: ['Present quarterly board report with audited financials', 'Finalize 3-year strategic growth blueprint']
      },
    ];
  }

  // 3. "Prepare for Interview" / Career & High-Impact Case Studies
  if (t.includes('interview') || t.includes('job') || t.includes('career') || t.includes('resume')) {
    return [
      {
        title: 'Resume & High-Impact Case Study Portfolio Overhaul',
        description: `Update portfolio and quantify business impact metrics specifically aligned with ${title}.`,
        targetDate: addDays(10),
        tasks: ['Quantify top 5 accomplishments with metrics', 'Publish project case study with interactive demo']
      },
      {
        title: 'Technical Competency & System Architecture Drills',
        description: 'Master core algorithmic problem solving, edge-case analysis, and distributed system design.',
        targetDate: addDays(25),
        tasks: ['Complete 30 domain-specific practice scenarios', 'Conduct 3 mock technical interviews']
      },
      {
        title: 'Behavioral Mastery with STAR Framework & Leadership Stories',
        description: 'Draft compelling narratives illustrating cross-functional conflict resolution, ownership, and velocity.',
        targetDate: addDays(40),
        tasks: ['Prepare 8 STAR method scenario narratives', 'Practice delivery with peer mentor']
      },
      {
        title: 'Executive Round Simulation, Offer Negotiation & Closing',
        description: 'Conduct final stage partner interviews and negotiate optimal compensation and level positioning.',
        targetDate: addDays(60),
        tasks: ['Research market salary percentiles & benefits', 'Sign and celebrate accepted offer letter']
      },
    ];
  }

  // 4. "Become AI Agent Developer" / Autonomous LLM & Multi-Agent Architecture
  if (t.includes('agent') || t.includes('ai') || t.includes('llm') || t.includes('gemini') || t.includes('deep learning')) {
    return [
      {
        title: 'Master LLM Foundations & Tool Calling Protocols',
        description: `Implement JSON schema definitions, function-calling loops, and structured output parsing tailored to ${title}.`,
        targetDate: addDays(14),
        tasks: ['Study function calling schemas & tool definitions', 'Build minimal agent decision loop in TypeScript']
      },
      {
        title: 'Build Autonomous Supervisor & Memory Pipeline',
        description: 'Design multi-turn state management, vector embeddings, and persistent context retrieval.',
        targetDate: addDays(30),
        tasks: ['Implement semantic search & memory caching', 'Set up multi-agent handoff routines']
      },
      {
        title: 'Rigorous Evaluation Benchmarks & Error Guardrails',
        description: 'Implement safety validations, prompt injection barriers, and automated benchmark test suites.',
        targetDate: addDays(50),
        tasks: ['Create regression test dataset', 'Run latency and accuracy evaluations']
      },
      {
        title: 'Production Deployment & Cloud Run Containerization',
        description: `Deploy high-performance containerized agent architecture for "${title}" with live telemetry.`,
        targetDate: addDays(75),
        tasks: ['Deploy Docker container to Cloud Run', 'Monitor live trace telemetry & user sessions']
      },
    ];
  }

  if (t.includes('run') || t.includes('marathon') || t.includes('fitness') || t.includes('workout') || t.includes('health') || t.includes('gym')) {
    return [
      {
        title: 'Establish Baseline Physiology & Weekly Consistency',
        description: `Build foundation habits and schedule weekly training blocks targeting ${title}.`,
        targetDate: addDays(14),
        tasks: ['Log initial biometric benchmarks', 'Complete 3 structured training sessions per week']
      },
      {
        title: 'Progressive Intensity & Performance Conditioning',
        description: 'Increase training volume safely while tracking recovery and heart-rate metrics.',
        targetDate: addDays(35),
        tasks: ['Hit 60% of target capacity threshold', 'Refine nutrition, hydration, and sleep hygiene']
      },
      {
        title: 'Full Simulation & Peak Stamina Benchmark',
        description: 'Execute race-pace simulation test and validate mental resilience under pressure.',
        targetDate: addDays(60),
        tasks: ['Complete dress rehearsal simulation', 'Adjust recovery protocols']
      },
      {
        title: 'Championship Event & Official Goal Achievement',
        description: `Cross the finish line and accomplish the primary objective for ${title}!`,
        targetDate: addDays(80),
        tasks: ['Follow pre-event taper schedule', 'Achieve and document final goal milestone']
      },
    ];
  }

  const cleanTitle = (title || '').trim();
  return [
    {
      title: `Phase 1: Foundation & Setup for ${cleanTitle}`,
      description: `Establish core prerequisites, tools, and strategic baseline needed to achieve ${cleanTitle}.`,
      targetDate: addDays(14),
      tasks: ['Define scope, research prerequisites, and set initial timeline', 'Complete foundational setup and initial milestone']
    },
    {
      title: `Phase 2: Core Execution & Focused Practice for ${cleanTitle}`,
      description: 'Commit to focused execution, logging daily progress and overcoming initial obstacles.',
      targetDate: addDays(35),
      tasks: ['Execute primary core phase of the goal', 'Track progress metrics and optimize strategy']
    },
    {
      title: `Phase 3: Advanced Optimization & Benchmark Testing for ${cleanTitle}`,
      description: 'Refine techniques, validate quality against real-world standards, and harden capabilities.',
      targetDate: addDays(60),
      tasks: ['Run benchmark evaluations and stress tests', 'Resolve key bottlenecks']
    },
    {
      title: `Phase 4: Final Mastery & Milestone Celebration for ${cleanTitle}`,
      description: `Complete final deliverables, achieve official mastery, and integrate learnings into long-term habits.`,
      targetDate: addDays(85),
      tasks: ['Finalize and review comprehensive goal outcome', 'Document achievement and celebrate completion']
    },
  ];
}

  // Generate AI Roadmap Checkpoints for a Goal Circuit (serves /api/gemini/goal-checkpoints & /api/gemini/generate-goal-checkpoints)
  const handleGenerateGoalCheckpoints = async (req: Request, res: Response) => {
    try {
      const { title, description = '', category = 'General' } = req.body || {};
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Goal title is required' });
      }

      const client = getGeminiClient();
      const todayStr = new Date().toISOString().slice(0, 10);

      if (!client) {
        return res.json({
          checkpoints: generateDomainCheckpoints(title, category, todayStr),
        });
      }

      const prompt = `You are the Goal Roadmap AI Architect for Personal Gemini Journal.
Create a structured 4-checkpoint AI roadmap to achieve this goal:
Goal Title: "${title}"
Description: "${description}"
Category: "${category}"
Today's Date: ${todayStr}

Task:
Generate 4 progressive, action-oriented circuit checkpoints (milestones) specifically engineered to achieve this exact goal.
CRITICAL REQUIREMENTS:
- EVERY checkpoint title must be UNIQUE and HIGHLY DOMAIN-SPECIFIC to "${title}".
- NEVER use generic placeholders like "Foundation & Setup" or "Core Execution".
- For hackathon / coding competitions: focus on idea validation, core MVP, aesthetic polish & QA, demo video pitch & submission.
- For executive leadership / CEO: focus on strategic vision & market moat, high-leverage team cadence, scaling revenue & unit economics, board governance.
- For interview preparation: focus on resume & case study overhaul, system architecture drills, behavioral STAR framework mastery, executive simulation & offer closing.
- For AI agent developer: focus on LLM foundations & tool calling protocols, autonomous supervisor & memory pipeline, rigorous evaluation benchmarks, production Cloud Run deployment.
- Each checkpoint must have:
  - "title": Specific, compelling checkpoint name
  - "description": 1-2 sentence actionable description explaining how to pass this checkpoint.
  - "targetDate": Estimated target completion date (YYYY-MM-DD).
  - "tasks": Array of 2 specific task strings

Return ONLY a valid JSON object in this format (no markdown code fences):
{
  "checkpoints": [
    { "title": "...", "description": "...", "targetDate": "${todayStr}", "tasks": ["...", "..."] }
  ]
}`;

      const responseText = await Promise.race([
        generateWithModelFallback(client, prompt),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Gemini call timeout')), 5000)),
      ]);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed.checkpoints && Array.isArray(parsed.checkpoints) && parsed.checkpoints.length > 0) {
          return res.json(parsed);
        }
      } catch {}

      return res.json({
        checkpoints: generateDomainCheckpoints(title, category, todayStr),
      });
    } catch (err: any) {
      console.warn('[Server] Generate goal checkpoints error:', err?.message);
      const todayStr = new Date().toISOString().slice(0, 10);
      return res.json({
        checkpoints: generateDomainCheckpoints(req.body?.title || 'Goal', req.body?.category || 'General', todayStr),
      });
    }
  };

  app.post('/api/gemini/goal-checkpoints', handleGenerateGoalCheckpoints);
  app.post('/api/gemini/generate-goal-checkpoints', handleGenerateGoalCheckpoints);

  // Discover Meaningful Memories from Journals using Gemini
  app.post('/api/gemini/discover-memories', async (req: Request, res: Response) => {
    try {
      const { journals = [], existingMemories = [], existingGoals = [] } = req.body || {};

      if (!Array.isArray(journals) || journals.length === 0) {
        return res.json({ suggestions: [] });
      }

      const eligibleJournals = journals.filter(
        (j: any) => j.privacy !== 'private' && j.privacy !== 'pin_locked' && !j.isPinLocked
      );

      if (eligibleJournals.length === 0) {
        return res.json({ suggestions: [] });
      }

      const client = getGeminiClient();
      if (!client) {
        const localSuggestions = eligibleJournals
          .slice(0, 3)
          .map((j: any) => ({
            id: 'mem_sug_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: j.title || 'Meaningful Milestone',
            summary: j.aiSummary || j.content?.slice(0, 140) + '...',
            category: j.category === 'learning' ? 'Learning' : j.category === 'memory' ? 'Milestones' : 'Achievements',
            date: j.createdAt ? j.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            mood: j.moodSnapshot?.mood || 'Reflective',
            sourceJournalIds: [j.id],
            topics: j.tags || ['Reflection'],
            aiGenerated: true,
          }));
        return res.json({ suggestions: localSuggestions });
      }

      const prompt = `You are the Memory Discovery Engine for Personal Gemini Journal.
Analyze these permitted user journal entries to identify 2-4 meaningful, memorable life milestones, achievements, or emotional moments.

ELIGIBLE JOURNALS (${eligibleJournals.length} entries):
${JSON.stringify(
  eligibleJournals.slice(0, 15).map((j: any) => ({
    id: j.id,
    title: j.title,
    content: j.content?.slice(0, 300),
    category: j.category,
    tags: j.tags,
    date: j.createdAt?.slice(0, 10),
    mood: j.moodSnapshot?.mood,
  }))
)}

EXISTING USER MEMORIES (Do NOT create duplicates of these):
${JSON.stringify(
  existingMemories.map((m: any) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    date: m.date,
  }))
)}

TASK:
1. Identify distinct, meaningful life memories.
2. NEVER duplicate an existing memory.
3. Reference the specific source journal ID(s) in "sourceJournalIds".
4. Assign an appropriate category.

Return ONLY a valid JSON object in this exact format (no markdown fences):
{
  "suggestions": [
    {
      "id": "sug_${Date.now()}_1",
      "title": "Clear Memory Title",
      "summary": "1-2 sentence AI summary of why this moment is meaningful.",
      "category": "Achievements",
      "date": "YYYY-MM-DD",
      "mood": "Proud",
      "topics": ["Topic 1", "Topic 2"],
      "sourceJournalIds": ["journal_id_here"],
      "aiGenerated": true
    }
  ]
}`;

      const responseText = await generateWithModelFallback(client, prompt);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch {
        return res.json({ suggestions: [] });
      }
    } catch (err: any) {
      console.warn('[Server] Gemini memory discovery error:', err?.message);
      return res.json({ suggestions: [] });
    }
  });

  // Weekly Memories Analysis Endpoint
  app.post('/api/memories/weekly-analysis', async (req: Request, res: Response) => {
    try {
      const { 
        weekId, 
        startDate, 
        endDate, 
        journals = [], 
        goals = [], 
        books = [], 
        music = [], 
        moods = [] 
      } = req.body || {};

      if (!weekId) {
        return res.status(400).json({ error: 'Week ID is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json({
          title: `Weekly Retrospective: ${weekId}`,
          aiSummary: `Summary for the week of ${startDate} to ${endDate}. (AI engine not configured)`,
          aiInsights: ['Continue your daily tracking for better future insights.'],
          keyAchievements: [],
          keyLearnings: [],
          topMood: 'Reflective',
          dominantSentiment: 'Neutral',
          musicalVibe: 'Ambient / Lo-fi',
          goalMomentum: 'Stable'
        });
      }

      const prompt = `You are the Weekly Memory Architect for Personal Gemini Journal.
Analyze the following user data for the week ${weekId} (${startDate} to ${endDate}):

JOURNALS: ${JSON.stringify(journals.map((j: any) => ({ title: j.title, content: j.content, mood: j.moodSnapshot?.mood })))}
GOALS: ${JSON.stringify(goals.map((g: any) => ({ title: g.title, progress: g.progress, milestones: g.milestones.filter((m: any) => m.completed) })))}
BOOKS: ${JSON.stringify(books.map((b: any) => ({ title: b.title, progress: b.progress, highlightsCount: b.highlights?.length })))}
MUSIC: ${JSON.stringify(music.slice(0, 20).map((m: any) => ({ title: m.track.title, artist: m.track.artist, mood: m.associatedMood })))}
MOODS: ${JSON.stringify(moods.map((m: any) => ({ mood: m.mood, emotions: m.emotions, intensity: m.intensity })))}

TASK:
1. Generate a compelling, premium TITLE for this specific week.
2. Provide a 3-4 sentence AI SUMMARY of the user's life journey this week.
3. Identify 3 deep AI INSIGHTS connecting different areas (e.g., how music influenced study, or how mood shifted after a goal achievement).
4. List 2-3 KEY ACHIEVEMENTS (milestones reached or hurdles overcome).
5. List 2-3 KEY LEARNINGS (from books or personal reflections).
6. Identify the TOP MOOD and DOMINANT SENTIMENT.
7. Describe the MUSICAL VIBE of the week (e.g., "Retro-futuristic Productivity", "Melancholic Reflection").
8. Evaluate GOAL MOMENTUM (e.g., "Accelerating", "Consistent", "Steady").

Return ONLY a valid JSON object in this exact format (no markdown code fences):
{
  "title": "...",
  "aiSummary": "...",
  "aiInsights": ["...", "...", "..."],
  "keyAchievements": ["...", "..."],
  "keyLearnings": ["...", "..."],
  "topMood": "...",
  "dominantSentiment": "...",
  "musicalVibe": "...",
  "goalMomentum": "..."
}`;

      const responseText = await generateWithModelFallback(client, prompt);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch {
        return res.json({
          title: `Weekly Retrospective: ${weekId}`,
          aiSummary: `A week focused on progress and reflection.`,
          aiInsights: ['Consistent activity across journals and goals.'],
          keyAchievements: [],
          keyLearnings: [],
          topMood: 'Balanced',
          dominantSentiment: 'Positive',
          musicalVibe: 'Ambient',
          goalMomentum: 'Consistent'
        });
      }
    } catch (err: any) {
      console.warn('[Server] Weekly analysis error:', err?.message);
      return res.status(500).json({ error: 'Failed to analyze weekly data' });
    }
  });

  // Ask My Journal Grounded Q&A Endpoint with Cross-Domain Knowledge
  app.post('/api/gemini/ask-my-journal', async (req: Request, res: Response) => {
    try {
      const {
        query: userQuery,
        conversationHistory = [],
        journals = [],
        goals = [],
        calendarEvents = [],
        books = [],
        musicItems = [],
        moodRecords = [],
      } = req.body || {};

      if (!userQuery || typeof userQuery !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const lowerQ = userQuery.toLowerCase();
      if (lowerQ.includes('password') || lowerQ.includes('pin') || lowerQ.includes('api key') || lowerQ.includes('secret')) {
        return res.json({
          text: 'I cannot access, store, or disclose account passwords, master PINs, API keys, or security credentials. Your security settings remain protected.',
          sources: [],
        });
      }

      const client = getGeminiClient();

      if (!client) {
        const matchingJournals = journals.filter((j: any) => {
          const q = userQuery.toLowerCase();
          return (
            (j.title && j.title.toLowerCase().includes(q)) ||
            (j.content && j.content.toLowerCase().includes(q)) ||
            (j.tags && j.tags.some((t: string) => t.toLowerCase().includes(q)))
          );
        });

        const sources: any[] = [];
        if (matchingJournals.length > 0) {
          matchingJournals.slice(0, 3).forEach((j: any) => {
            sources.push({ id: j.id, title: j.title, type: 'journal', category: j.category, date: j.createdAt?.slice(0, 10) });
          });
        }
        goals.slice(0, 2).forEach((g: any) => {
          sources.push({ id: g.id, title: g.title, type: 'goal', category: g.category });
        });
        calendarEvents.slice(0, 2).forEach((e: any) => {
          sources.push({ id: e.id, title: e.title, type: 'calendar', date: e.date });
        });
        moodRecords.slice(0, 2).forEach((m: any) => {
          sources.push({ id: m.id, title: `${m.mood} (${m.intensity}/10)`, type: 'mood', date: m.createdAt?.slice(0, 10) });
        });

        return res.json({
          text: `Based on your life memory log (${journals.length} journals, ${goals.length} goals, ${calendarEvents.length} calendar events, ${books.length} books, ${musicItems.length} songs, ${moodRecords.length} mood entries): You have an active life journey tracking continuous progress across learning, wellness, and career growth.`,
          sources,
          summary: `Cross-Life Overview: You have ${journals.length} journal entries, ${goals.length} active goals, ${calendarEvents.length} calendar events, ${books.length} books in your library, ${musicItems.length} soundtrack anchors, and ${moodRecords.length} emotional checkpoints.`,
          insights: [
            'Consistent effort recorded toward career and learning milestones',
            'Active engagement with study sessions and reading progress',
            moodRecords.length > 0 ? `Emotional patterns show a primary focus on ${moodRecords[0].mood} states recently.` : 'Start logging your mood to see emotional trends.',
          ],
          tips: [
            'Review upcoming calendar events to align daily study blocks with target goal deadlines',
            'Pair quiet ambient music sessions with deep reading blocks for maximum retention',
          ],
        });
      }

      const prompt = `You are 'Ask My Journal', the primary AI Personal Assistant for Personal Gemini Journal.
You have full authorized access to the user's complete life data streams across 6 canonical areas:

1. PERMITTED USER JOURNALS (${journals.length} entries):
${JSON.stringify(
  journals.map((j: any) => ({
    id: j.id,
    title: j.title,
    content: j.content,
    category: j.category,
    tags: j.tags,
    date: j.createdAt?.slice(0, 10),
  }))
)}

2. PERMITTED USER GOALS & F1 CIRCUIT CHECKPOINTS (${goals.length} goals):
${JSON.stringify(
  goals.map((g: any) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    status: g.status, // 'completed' means 100% achieved
    progress: g.progress,
    completedAt: g.completedAt,
    aiNotes: g.aiNotes,
    checkpoints: (g.milestones || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      completed: m.completed,
      completedAt: m.completedAt,
      evidence: m.evidence,
      aiExplanation: m.aiExplanation,
    })),
  }))
)}

3. PERMITTED USER CALENDAR EVENTS (${calendarEvents.length} events):
${JSON.stringify(
  calendarEvents.map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    category: e.category,
  }))
)}

4. PERMITTED USER BOOKS / LIBRARY (${books.length} books):
${JSON.stringify(
  books.map((b: any) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    status: b.status,
    rating: b.rating,
    review: b.review,
    progress: b.progress,
    keyLearnings: b.keyLearnings,
    highlights: (b.highlights || []).map((h: any) => ({
      text: h.text,
      userNote: h.userNote,
      aiLearningNote: h.aiLearningNote
    }))
  }))
)}

5. PERMITTED USER MUSIC SOUNDTRACK (${musicItems.length} songs):
${JSON.stringify(
  musicItems.map((m: any) => ({
    id: m.id,
    title: m.title,
    artist: m.artist,
    moodAssociation: m.moodAssociation,
  }))
)}

6. PERMITTED USER MOOD & STRESS DATA (${moodRecords.length} entries):
${JSON.stringify(
  moodRecords.map((m: any) => ({
    id: m.id,
    mood: m.mood,
    intensity: m.intensity,
    stress: m.stress,
    energy: m.energy,
    confidence: m.confidence,
    note: m.note,
    date: m.createdAt?.slice(0, 10),
  }))
)}

CONVERSATION HISTORY:
${JSON.stringify(conversationHistory.slice(-6))}

USER QUESTION / PROMPT: "${userQuery}"

STRICT GUIDELINES:
1. Answer the user's question accurately, grounded strictly in the provided 6 data categories.
2. Provide evidence by listing referenced items in "sources", specifying their "type" ('journal', 'goal', 'calendar', 'book', 'music', or 'mood').
3. Include an "summary" string that synthesizes cross-domain data from Music, Books, Goals, Calendar, Mood, and Journal entries.
4. Include 2-3 "insights" (array of strings) highlighting cross-connections or trends across their life data.
5. Include 2-3 "tips" (array of strings) giving personalized actionable recommendations.

Return ONLY a valid JSON object in this exact format (no markdown fences):
{
  "text": "Your accurate grounded response to the question...",
  "sources": [
    { "id": "item_id", "title": "Item Title", "type": "journal", "category": "Learning", "date": "YYYY-MM-DD" }
  ],
  "summary": "AI Summary combining music, books, goals, calendar events, mood records, and journal records...",
  "insights": [
    "Cross-connection insight 1...",
    "Cross-connection insight 2..."
  ],
  "tips": [
    "Personalized actionable tip 1...",
    "Personalized actionable tip 2..."
  ],
  "actionSuggestion": null
}`;

      const responseText = await generateWithModelFallback(client, prompt);
      const cleanJsonStr = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch {
        return res.json({
          text: responseText || 'Analyzed your complete life data history.',
          sources: journals.slice(0, 2).map((j: any) => ({
            id: j.id,
            title: j.title,
            type: 'journal',
            category: j.category,
            date: j.createdAt?.slice(0, 10),
          })),
          summary: `Synthesized data across ${journals.length} journals, ${goals.length} goals, ${calendarEvents.length} calendar events, ${books.length} books, and ${musicItems.length} music tracks.`,
          insights: ['Sustained progress across career and study goals', 'High alignment between journal reflections and scheduled tasks'],
          tips: ['Block out dedicated study focus times on your calendar', 'Log key book takeaways in your journal for stronger retention'],
        });
      }
    } catch (err: any) {
      console.warn('[Server] Gemini Ask My Journal error:', err?.message);
      const isQuota = (err?.message || '').includes('RESOURCE_EXHAUSTED') || (err?.message || '').includes('quota');
      return res.json({
        text: isQuota 
          ? 'The AI is currently busy handling many requests. Please wait about 30 seconds before asking again.'
          : 'I ran into an error retrieving your life insights. Please try asking again in a moment.',
        sources: [],
      });
    }
  });

  // --- Jamendo Music API Routes ---
  app.get('/api/music/search', async (req: Request, res: Response) => {
    try {
      const clientId = process.env.JAMENDO_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({ error: 'Jamendo Client ID not configured' });
      }

      const q = (req.query.q as string) || '';
      const genre = (req.query.genre as string) || '';
      const limit = (req.query.limit as string) || '20';

      const jamendoParams = new URLSearchParams({
        client_id: clientId,
        format: 'json',
        limit: limit,
      });

      if (q) jamendoParams.append('search', q);
      if (genre && genre !== 'All') jamendoParams.append('tags', genre.toLowerCase());

      if (!q && (!genre || genre === 'All')) {
        jamendoParams.append('boost', 'popularity_total');
      }

      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${jamendoParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Jamendo API responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results) {
        return res.json({ tracks: [] });
      }

      const tracks = data.results.map((t: any) => ({
        id: String(t.id),
        title: t.name,
        artist: t.artist_name,
        album: t.album_name || '',
        albumImage: t.image || '',
        duration: parseInt(t.duration) || 0,
        genre: genre !== 'All' && genre ? genre : 'All',
        audioUrl: `/api/music/stream/${t.id}`,
        previewUrl: t.audio,
        provider: 'jamendo',
        providerUrl: t.shareurl || '',
        license: t.license_ccurl || '',
        tags: t.musicinfo?.tags?.tags || [],
        releaseYear: t.releasedate ? parseInt(t.releasedate.substring(0, 4)) : undefined,
      }));

      return res.json({ tracks });
    } catch (err: any) {
      console.error('[Server] Jamendo search error:', err.message);
      return res.status(500).json({ error: 'Failed to search music' });
    }
  });

  app.get('/api/music/featured', async (req: Request, res: Response) => {
    try {
      const clientId = process.env.JAMENDO_CLIENT_ID;
      if (!clientId) {
        return res.status(503).json({ error: 'Jamendo Client ID not configured' });
      }

      const genre = (req.query.genre as string) || '';
      const limit = (req.query.limit as string) || '15';

      const jamendoParams = new URLSearchParams({
        client_id: clientId,
        format: 'json',
        limit: limit,
        boost: 'popularity_total',
      });

      if (genre && genre !== 'All') jamendoParams.append('tags', genre.toLowerCase());

      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${jamendoParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Jamendo API responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results) {
        return res.json({ tracks: [] });
      }

      const tracks = data.results.map((t: any) => ({
        id: String(t.id),
        title: t.name,
        artist: t.artist_name,
        album: t.album_name || '',
        albumImage: t.image || '',
        duration: parseInt(t.duration) || 0,
        genre: genre !== 'All' && genre ? genre : 'All',
        audioUrl: `/api/music/stream/${t.id}`,
        previewUrl: t.audio,
        provider: 'jamendo',
        providerUrl: t.shareurl || '',
        license: t.license_ccurl || '',
        tags: t.musicinfo?.tags?.tags || [],
        releaseYear: t.releasedate ? parseInt(t.releasedate.substring(0, 4)) : undefined,
      }));

      return res.json({ tracks });
    } catch (err: any) {
      console.error('[Server] Jamendo featured error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch featured music' });
    }
  });

  app.get('/api/music/stream/:id', async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) {
      return res.status(403).send('Jamendo Client ID not configured');
    }
    const trackId = req.params.id;
    const streamUrl = `https://api.jamendo.com/v3.0/tracks/file/?client_id=${clientId}&id=${trackId}&action=stream`;
    
    try {
      const response = await fetch(streamUrl);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch audio stream');
      }

      // Set headers from the Jamendo response
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      res.setHeader('Accept-Ranges', 'bytes');

      if (response.body) {
        for await (const chunk of response.body as any) {
          res.write(chunk);
        }
        res.end();
      } else {
        res.status(500).send('No stream body available');
      }
    } catch (err: any) {
      console.error('[Server] Jamendo streaming proxy error:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Error streaming music track');
      }
    }
  });

  // --- AI-Generated Highlight Learning Synthesis Endpoint ---
  app.post('/api/books/generate-learning', async (req: Request, res: Response) => {
    try {
      const { text, bookTitle, bookAuthor } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Highlight text is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        // Resilient fallback note if Gemini client is not ready
        return res.json({
          mainIdea: text.slice(0, 50) + '...',
          learningTakeaway: 'Capture conceptual principles with discipline.',
          explanation: `Highlight text recorded: "${text}"`,
          tags: ['Reading', 'Highlights', 'Insights'],
        });
      }

      const systemInstruction = 'You are an expert learning synthesizer. You analyze a book highlight and synthesize a concise, powerful learning note containing the main idea, a clear key takeaway, an insightful explanation, and 3-5 relevant conceptual tags. Return your response as a JSON object matching the requested schema.';
      
      const prompt = `Analyze this book highlight:
Book: "${bookTitle || 'Unknown Book'}"
Author: "${bookAuthor || 'Unknown Author'}"
Highlight Content: "${text}"

Synthesize the learning note in JSON format.`;

      const responseText = await generateWithModelFallback(client, prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainIdea: { type: Type.STRING },
            learningTakeaway: { type: Type.STRING },
            explanation: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['mainIdea', 'learningTakeaway', 'explanation', 'tags']
        }
      });

      try {
        const parsed = JSON.parse(responseText.trim());
        return res.json(parsed);
      } catch (e) {
        return res.json({
          mainIdea: text.slice(0, 80) + '...',
          learningTakeaway: 'Extracted direct takeaway from highlight.',
          explanation: text,
          tags: ['Reading', 'Self Reflection'],
        });
      }
    } catch (err: any) {
      console.error('[Server] Books generate-learning error:', err.message);
      return res.status(500).json({ error: 'Failed to generate learning note' });
    }
  });

  // --- AI Conversational Book Companion Endpoint ---
  app.post('/api/books/chat', async (req: Request, res: Response) => {
    try {
      const { message, books = [] } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json({
          text: `The AI service is offline. Offline insight: Your digital library currently indexes ${books.length} books. Keep tracking your reading journeys!`,
          sources: [],
        });
      }

      const systemInstruction = 'You are the Personal Book Companion for the user\'s Personal Gemini Journal. Your role is to answer questions, analyze, and discuss the books the user is reading, their reading progress, their highlights, and the AI-generated learning notes. Respond based on the user\'s books data provided. If you do not find the relevant information in the provided books, kindly state that the user has not recorded that information in their books list yet. Always structure your responses beautifully in markdown. Return your final output as a JSON object matching the requested schema.';

      const formattedBooks = books.map((b: any) => ({
        id: b.id,
        title: b.title,
        authors: b.authors,
        categories: b.categories,
        readingStatus: b.readingStatus,
        progress: b.progress,
        currentPage: b.currentPage,
        pageCount: b.pageCount,
        highlightsCount: b.highlights?.length || 0,
        highlights: (b.highlights || []).map((h: any) => ({
          text: h.text,
          chapter: h.chapter,
          page: h.page,
          userNote: h.userNote,
          learningNote: h.aiLearningNote,
        })),
        readingSessionsCount: b.readingSessions?.length || 0,
      }));

      const prompt = `User's Question: "${message}"

User's Digital Shelf Context (Ground your answer in this data):
${JSON.stringify(formattedBooks)}

Please answer the user's question, grounding your response strictly in their recorded books and highlights if they are asking about their library or reading progress. Structure the response beautifully and list reference sources.`;

      const responseText = await generateWithModelFallback(client, prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  page: { type: Type.STRING }
                },
                required: ['id', 'title', 'type']
              }
            }
          },
          required: ['text', 'sources']
        }
      });

      try {
        const parsed = JSON.parse(responseText.trim());
        return res.json(parsed);
      } catch (e) {
        return res.json({
          text: responseText,
          sources: [],
        });
      }
    } catch (err: any) {
      console.error('[Server] Books AI chat error:', err.message);
      return res.status(500).json({ error: 'Failed to chat about books' });
    }
  });

  // --- Vite Middleware Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Personal Gemini Journal] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Personal Gemini Journal] Failed to start server:', err);
  process.exit(1);
});
