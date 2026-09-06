/**
 * Personal Gemini Journal - Secure API Client
 * Connects the client UI to server-side API endpoints.
 * Never passes or accesses API keys on the client.
 */

import { ArchitectureHealth } from '../types';
import { sanitizeErrorMessage } from '../utils/errors';

export async function fetchServerHealth(): Promise<ArchitectureHealth> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch server health:', sanitizeErrorMessage(err));
    throw new Error(sanitizeErrorMessage(err));
  }
}

export async function fetchArchitectureStatus(): Promise<{
  securityArchitecture: {
    dataIsolation: string;
    apiBoundary: string;
    pinProtection: string;
    geminiConfigured: boolean;
  };
  featuresRegistered: string[];
}> {
  try {
    const res = await fetch('/api/architecture/status');
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch architecture status:', sanitizeErrorMessage(err));
    throw new Error(sanitizeErrorMessage(err));
  }
}

export async function fetchGeminiServiceHealth(): Promise<{
  service: string;
  ready: boolean;
  serverSideExecution: boolean;
  modelAlias: string;
  groundingPolicy: string;
}> {
  try {
    const res = await fetch('/api/gemini/health');
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch Gemini service health:', sanitizeErrorMessage(err));
    throw new Error(sanitizeErrorMessage(err));
  }
}

export async function analyzeJournalWithGemini(payload: {
  title: string;
  content: string;
  existingGoals?: any[];
}): Promise<{
  summary: string;
  insights: string[];
  suggestedTags?: string[];
  matchedGoalIds: string[];
  detectedSuggestions: any[];
  detectedEvents?: any[];
}> {
  try {
    const res = await fetch('/api/gemini/analyze-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Analysis status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Gemini journal analysis failed, fallback locally:', err);
    return {
      summary: payload.content.slice(0, 120) + '...',
      insights: ['Reflective entry recorded'],
      suggestedTags: ['Journal', 'Reflection'],
      matchedGoalIds: [],
      detectedSuggestions: [],
      detectedEvents: [],
    };
  }
}

export async function generateGoalCheckpointsWithGemini(payload: {
  title: string;
  description?: string;
  category?: string;
}): Promise<{
  checkpoints: Array<{ title: string; description: string; targetDate?: string; tasks?: string[] }>;
}> {
  try {
    let res = await fetch('/api/gemini/goal-checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      res = await fetch('/api/gemini/generate-goal-checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to generate goal checkpoints via Gemini, using local domain engine fallback:', err);
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const addDays = (days: number) => new Date(now + days * 86400000).toISOString().slice(0, 10);
    const t = (payload.title || '').toLowerCase();

    // High-fidelity domain fallbacks
    if (t.includes('hackathon') || t.includes('contest') || t.includes('competition') || (t.includes('win') && t.includes('ai'))) {
      return {
        checkpoints: [
          {
            title: 'Idea Validation, System Architecture & Challenge Specification',
            description: `Analyze judging rubrics, outline winning differentiators, and establish tech stack for ${payload.title}.`,
            targetDate: addDays(7),
            tasks: ['Verify compliance with all hackathon criteria', 'Scaffold repository, CI/CD pipeline, and backend services'],
          },
          {
            title: 'Build Core MVP with Gemini & Cloud Run Integration',
            description: 'Deliver the primary functional demo with secure authentication, API proxies, and persistent storage.',
            targetDate: addDays(18),
            tasks: ['Implement end-to-end user workflow', 'Connect Firebase Firestore and Gemini backend'],
          },
          {
            title: 'Aesthetic Polish, Responsive Design & Rigorous QA',
            description: 'Eliminate UI bugs, refine typography and animations, and test all edge-case scenarios.',
            targetDate: addDays(28),
            tasks: ['Conduct comprehensive responsive UI test', 'Verify sub-second page load and zero console errors'],
          },
          {
            title: 'Demo Video Production, Compelling Pitch & Final Submission',
            description: 'Record concise 3-minute video showcase, draft documentation, and submit to judges before deadline.',
            targetDate: addDays(35),
            tasks: ['Record high-definition video walkthrough', 'Submit official entry on hackathon portal'],
          },
        ],
      };
    }

    if (t.includes('ceo') || t.includes('leadership') || t.includes('executive') || t.includes('founder') || t.includes('chief executive')) {
      return {
        checkpoints: [
          {
            title: 'Define Strategic Vision, Market Moat & Operating Philosophy',
            description: `Draft company mission, product-market fit metrics, and competitive differentiation for ${payload.title}.`,
            targetDate: addDays(15),
            tasks: ['Draft company core value framework', 'Analyze competitor positioning and market gaps'],
          },
          {
            title: 'Build High-Leverage Team & Operational Cadence',
            description: 'Recruit stellar leadership lieutenants and establish rigorous weekly executive review cycles.',
            targetDate: addDays(35),
            tasks: ['Implement OKR tracking framework', 'Design cross-functional communication cadence'],
          },
          {
            title: 'Scale Revenue Engine, Unit Economics & Customer Retention',
            description: 'Optimize customer acquisition cost, improve net retention rate, and build enterprise pipeline.',
            targetDate: addDays(60),
            tasks: ['Review unit economics & churn metrics', 'Close 3 strategic enterprise lighthouse partners'],
          },
          {
            title: 'Executive Board Governance & Long-Term Scaling',
            description: 'Lead shareholder meetings, align investor stakeholders, and cement sustainable market leadership.',
            targetDate: addDays(90),
            tasks: ['Present quarterly board report with audited financials', 'Finalize 3-year strategic growth blueprint'],
          },
        ],
      };
    }

    if (t.includes('interview') || t.includes('job') || t.includes('career') || t.includes('resume')) {
      return {
        checkpoints: [
          {
            title: 'Resume & High-Impact Case Study Portfolio Overhaul',
            description: `Update portfolio and quantify business impact metrics specifically aligned with ${payload.title}.`,
            targetDate: addDays(10),
            tasks: ['Quantify top 5 accomplishments with metrics', 'Publish project case study with interactive demo'],
          },
          {
            title: 'Technical Competency & System Architecture Drills',
            description: 'Master core algorithmic problem solving, edge-case analysis, and distributed system design.',
            targetDate: addDays(25),
            tasks: ['Complete 30 domain-specific practice scenarios', 'Conduct 3 mock technical interviews'],
          },
          {
            title: 'Behavioral Mastery with STAR Framework & Leadership Stories',
            description: 'Draft compelling narratives illustrating cross-functional conflict resolution, ownership, and velocity.',
            targetDate: addDays(40),
            tasks: ['Prepare 8 STAR method scenario narratives', 'Practice delivery with peer mentor'],
          },
          {
            title: 'Executive Round Simulation, Offer Negotiation & Closing',
            description: 'Conduct final stage partner interviews and negotiate optimal compensation and level positioning.',
            targetDate: addDays(60),
            tasks: ['Research market salary percentiles & benefits', 'Sign and celebrate accepted offer letter'],
          },
        ],
      };
    }

    if (t.includes('agent') || t.includes('ai') || t.includes('llm') || t.includes('gemini') || t.includes('deep learning')) {
      return {
        checkpoints: [
          {
            title: 'Master LLM Foundations & Tool Calling Protocols',
            description: `Implement JSON schema definitions, function-calling loops, and structured output parsing tailored to ${payload.title}.`,
            targetDate: addDays(14),
            tasks: ['Study function calling schemas & tool definitions', 'Build minimal agent decision loop in TypeScript'],
          },
          {
            title: 'Build Autonomous Supervisor & Memory Pipeline',
            description: 'Design multi-turn state management, vector embeddings, and persistent context retrieval.',
            targetDate: addDays(30),
            tasks: ['Implement semantic search & memory caching', 'Set up multi-agent handoff routines'],
          },
          {
            title: 'Rigorous Evaluation Benchmarks & Error Guardrails',
            description: 'Implement safety validations, prompt injection barriers, and automated benchmark test suites.',
            targetDate: addDays(50),
            tasks: ['Create regression test dataset', 'Run latency and accuracy evaluations'],
          },
          {
            title: 'Production Deployment & Cloud Run Containerization',
            description: `Deploy high-performance containerized agent architecture for "${payload.title}" with live telemetry.`,
            targetDate: addDays(75),
            tasks: ['Deploy Docker container to Cloud Run', 'Monitor live trace telemetry & user sessions'],
          },
        ],
      };
    }

    return {
      checkpoints: [
        { title: `Phase 1: Foundation & Setup for ${payload.title}`, description: `Initial setup and scope definition for ${payload.title}.`, targetDate: addDays(14) },
        { title: `Phase 2: Core Execution & Practice for ${payload.title}`, description: 'Deep execution phase and progress logging.', targetDate: addDays(35) },
        { title: `Phase 3: Testing & Optimization for ${payload.title}`, description: 'Refinement, verification, and feedback loop.', targetDate: addDays(60) },
        { title: `Phase 4: Final Mastery & Review for ${payload.title}`, description: 'Final completion and integration of learnings.', targetDate: addDays(85) },
      ],
    };
  }
}

export async function askMyJournalWithGemini(payload: {
  query: string;
  conversationHistory?: any[];
  journals: any[];
  goals?: any[];
  calendarEvents?: any[];
  books?: any[];
  musicItems?: any[];
  moodRecords?: any[];
}): Promise<{
  text: string;
  sources: { id: string; title: string; category?: string; date?: string; type?: string }[];
  summary?: string;
  insights?: string[];
  tips?: string[];
  actionSuggestion?: any;
}> {
  try {
    const res = await fetch('/api/gemini/ask-my-journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Ask My Journal status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Ask My Journal request failed:', err);
    return {
      text: 'I ran into an issue analyzing your life entries. Please try asking again.',
      sources: [],
    };
  }
}

export async function discoverMemoriesWithGemini(payload: {
  journals: any[];
  existingMemories?: any[];
  existingGoals?: any[];
}): Promise<{
  suggestions: any[];
}> {
  try {
    const res = await fetch('/api/gemini/discover-memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Discover memories status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Gemini memory discovery failed, fallback:', err);
    return { suggestions: [] };
  }
}

