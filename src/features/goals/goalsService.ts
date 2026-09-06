import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { GoalTrack, GoalMilestone, GoalTaskItem, AISuggestion, JournalEntry } from '../../types';
import { generateGoalCheckpointsWithGemini } from '../../services/api.client';

const GOALS_CACHE_PREFIX = 'pgj_goals_v7_';
const DELETED_GOALS_KEY = 'pgj_deleted_goal_ids';
const COMPLETED_MILESTONES_KEY_PREFIX = 'pgj_user_completed_ms_';

export function getDeletedGoalIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_GOALS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedGoalId(goalId: string): void {
  try {
    const ids = getDeletedGoalIds();
    ids.add(goalId);
    localStorage.setItem(DELETED_GOALS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getUserCompletedMilestones(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${COMPLETED_MILESTONES_KEY_PREFIX}${uid}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordUserCompletedMilestone(uid: string, milestoneId: string, completed: boolean): void {
  try {
    const set = getUserCompletedMilestones(uid);
    if (completed) {
      set.add(milestoneId);
    } else {
      set.delete(milestoneId);
    }
    localStorage.setItem(`${COMPLETED_MILESTONES_KEY_PREFIX}${uid}`, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Robust sanitizer to prevent Firestore rejection caused by undefined properties
 */
function sanitizeForFirestore(data: any): any {
  if (data === undefined || data === null) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result;
}

// Initial realistic default goal track for new users with domain-specific circuits
const DEFAULT_GOALS = (uid: string): GoalTrack[] => [
  {
    id: 'goal-f1-hackathon',
    userId: uid,
    title: 'Win Google Gen AI Hackathon',
    description: 'Validate challenge architecture, build Gemini & Cloud Run MVP, refine responsive aesthetic polish, and deliver winning demo pitch.',
    category: 'Career & Growth',
    status: 'active',
    progress: 0,
    targetDate: '2026-10-31',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit tailored for Google Gen AI Hackathon championship. Complete checkpoints to progress your F1 car.',
    milestones: [
      {
        id: 'ms-hack-1',
        title: 'Idea Validation, System Architecture & Challenge Specification',
        description: 'Analyze judging rubrics, outline winning differentiators, and establish tech stack.',
        order: 1,
        completed: false,
        targetDate: '2026-09-12',
        tasks: [
          { id: 'thack-1', title: 'Verify compliance with all hackathon criteria', completed: false },
          { id: 'thack-2', title: 'Scaffold repository, CI/CD pipeline, and backend services', completed: false },
        ],
      },
      {
        id: 'ms-hack-2',
        title: 'Build Core MVP with Gemini & Cloud Run Integration',
        description: 'Deliver the primary functional demo with secure authentication, API proxies, and persistent storage.',
        order: 2,
        completed: false,
        targetDate: '2026-09-25',
        tasks: [
          { id: 'thack-3', title: 'Implement end-to-end user workflow', completed: false },
          { id: 'thack-4', title: 'Connect Firebase Firestore and Gemini backend', completed: false },
        ],
      },
      {
        id: 'ms-hack-3',
        title: 'Aesthetic Polish, Responsive Design & Rigorous QA',
        description: 'Eliminate UI bugs, refine typography and animations, and test all edge-case scenarios.',
        order: 3,
        completed: false,
        targetDate: '2026-10-15',
        tasks: [
          { id: 'thack-5', title: 'Conduct comprehensive responsive UI test', completed: false },
          { id: 'thack-6', title: 'Verify sub-second page load and zero console errors', completed: false },
        ],
      },
      {
        id: 'ms-hack-4',
        title: 'Demo Video Production, Compelling Pitch & Final Submission',
        description: 'Record concise 3-minute video showcase, draft documentation, and submit to judges before deadline.',
        order: 4,
        completed: false,
        targetDate: '2026-10-31',
        tasks: [
          { id: 'thack-7', title: 'Record high-definition video walkthrough', completed: false },
          { id: 'thack-8', title: 'Submit official entry on hackathon portal', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-become-ceo',
    userId: uid,
    title: 'Become CEO',
    description: 'Define strategic company vision, build high-leverage team cadence, scale unit economics, and lead executive board governance.',
    category: 'Leadership & Executive',
    status: 'active',
    progress: 0,
    targetDate: '2027-06-30',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit tailored for Executive CEO leadership roadmap.',
    milestones: [
      {
        id: 'ms-ceo-1',
        title: 'Define Strategic Vision, Market Moat & Operating Philosophy',
        description: 'Draft company mission, product-market fit metrics, and competitive differentiation.',
        order: 1,
        completed: false,
        targetDate: '2026-10-15',
        tasks: [
          { id: 'tceo-1', title: 'Draft company core value framework', completed: false },
          { id: 'tceo-2', title: 'Analyze competitor positioning and market gaps', completed: false },
        ],
      },
      {
        id: 'ms-ceo-2',
        title: 'Build High-Leverage Team & Operational Cadence',
        description: 'Recruit stellar leadership lieutenants and establish rigorous weekly executive review cycles.',
        order: 2,
        completed: false,
        targetDate: '2026-12-01',
        tasks: [
          { id: 'tceo-3', title: 'Implement OKR tracking framework', completed: false },
          { id: 'tceo-4', title: 'Design cross-functional communication cadence', completed: false },
        ],
      },
      {
        id: 'ms-ceo-3',
        title: 'Scale Revenue Engine, Unit Economics & Customer Retention',
        description: 'Optimize customer acquisition cost, improve net retention rate, and build enterprise pipeline.',
        order: 3,
        completed: false,
        targetDate: '2027-02-28',
        tasks: [
          { id: 'tceo-5', title: 'Review unit economics & churn metrics', completed: false },
          { id: 'tceo-6', title: 'Close 3 strategic enterprise lighthouse partners', completed: false },
        ],
      },
      {
        id: 'ms-ceo-4',
        title: 'Executive Board Governance & Long-Term Scaling',
        description: 'Lead shareholder meetings, align investor stakeholders, and cement sustainable market leadership.',
        order: 4,
        completed: false,
        targetDate: '2027-06-30',
        tasks: [
          { id: 'tceo-7', title: 'Present quarterly board report with audited financials', completed: false },
          { id: 'tceo-8', title: 'Finalize 3-year strategic growth blueprint', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-prepare-interview',
    userId: uid,
    title: 'Prepare for Interview',
    description: 'Overhaul resume portfolio, conquer system architecture drills, master behavioral STAR leadership stories, and negotiate top offers.',
    category: 'Career & Growth',
    status: 'active',
    progress: 0,
    targetDate: '2026-11-30',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit tailored for high-impact interview preparation.',
    milestones: [
      {
        id: 'ms-int-1',
        title: 'Resume & High-Impact Case Study Portfolio Overhaul',
        description: 'Update portfolio and quantify business impact metrics specifically aligned with target roles.',
        order: 1,
        completed: false,
        targetDate: '2026-09-20',
        tasks: [
          { id: 'tint-1', title: 'Quantify top 5 accomplishments with metrics', completed: false },
          { id: 'tint-2', title: 'Publish project case study with interactive demo', completed: false },
        ],
      },
      {
        id: 'ms-int-2',
        title: 'Technical Competency & System Architecture Drills',
        description: 'Master core algorithmic problem solving, edge-case analysis, and distributed system design.',
        order: 2,
        completed: false,
        targetDate: '2026-10-15',
        tasks: [
          { id: 'tint-3', title: 'Complete 30 domain-specific practice scenarios', completed: false },
          { id: 'tint-4', title: 'Conduct 3 mock technical interviews', completed: false },
        ],
      },
      {
        id: 'ms-int-3',
        title: 'Behavioral Mastery with STAR Framework & Leadership Stories',
        description: 'Draft compelling narratives illustrating cross-functional conflict resolution, ownership, and velocity.',
        order: 3,
        completed: false,
        targetDate: '2026-11-01',
        tasks: [
          { id: 'tint-5', title: 'Prepare 8 STAR method scenario narratives', completed: false },
          { id: 'tint-6', title: 'Practice delivery with peer mentor', completed: false },
        ],
      },
      {
        id: 'ms-int-4',
        title: 'Executive Round Simulation, Offer Negotiation & Closing',
        description: 'Conduct final stage partner interviews and negotiate optimal compensation and level positioning.',
        order: 4,
        completed: false,
        targetDate: '2026-11-30',
        tasks: [
          { id: 'tint-7', title: 'Research market salary percentiles & benefits', completed: false },
          { id: 'tint-8', title: 'Sign and celebrate accepted offer letter', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-ai-agent-developer',
    userId: uid,
    title: 'Become AI Agent Developer',
    description: 'Master LLM foundations, tool-calling schemas, autonomous supervisor architectures, memory caching, and Cloud Run production deployments.',
    category: 'Engineering & AI',
    status: 'active',
    progress: 0,
    targetDate: '2026-12-31',
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit tailored for autonomous AI Agent development.',
    milestones: [
      {
        id: 'ms-agent-1',
        title: 'Master LLM Foundations & Tool Calling Protocols',
        description: 'Implement JSON schema definitions, function-calling loops, and structured output parsing.',
        order: 1,
        completed: false,
        targetDate: '2026-09-30',
        tasks: [
          { id: 'tagent-1', title: 'Study function calling schemas & tool definitions', completed: false },
          { id: 'tagent-2', title: 'Build minimal agent decision loop in TypeScript', completed: false },
        ],
      },
      {
        id: 'ms-agent-2',
        title: 'Build Autonomous Supervisor & Memory Pipeline',
        description: 'Design multi-turn state management, vector embeddings, and persistent context retrieval.',
        order: 2,
        completed: false,
        targetDate: '2026-10-31',
        tasks: [
          { id: 'tagent-3', title: 'Implement semantic search & memory caching', completed: false },
          { id: 'tagent-4', title: 'Set up multi-agent handoff routines', completed: false },
        ],
      },
      {
        id: 'ms-agent-3',
        title: 'Rigorous Evaluation Benchmarks & Error Guardrails',
        description: 'Implement safety validations, prompt injection barriers, and automated benchmark test suites.',
        order: 3,
        completed: false,
        targetDate: '2026-11-30',
        tasks: [
          { id: 'tagent-5', title: 'Create regression test dataset', completed: false },
          { id: 'tagent-6', title: 'Run latency and accuracy evaluations', completed: false },
        ],
      },
      {
        id: 'ms-agent-4',
        title: 'Production Deployment & Cloud Run Containerization',
        description: 'Deploy high-performance containerized agent architecture with live telemetry.',
        order: 4,
        completed: false,
        targetDate: '2026-12-31',
        tasks: [
          { id: 'tagent-7', title: 'Deploy Docker container to Cloud Run', completed: false },
          { id: 'tagent-8', title: 'Monitor live trace telemetry & user sessions', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-data-analyst',
    userId: uid,
    title: 'Become a Senior Data Analyst',
    description: 'Master advanced SQL, data pipelines, predictive models, and cloud analytics dashboards.',
    category: 'Career & Growth',
    status: 'completed',
    progress: 100,
    targetDate: '2026-12-31',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit 1 Fully Completed! Goal achieved with verified milestone evidence in journal logs.',
    milestones: [
      {
        id: 'ms-1',
        title: 'Master Advanced SQL & CTEs',
        description: 'Deep dive into window functions, recursive CTEs, and query optimization.',
        order: 1,
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        targetDate: '2026-08-15',
        evidence: 'Completed 15 LeetCode SQL hard problems and wrote 3 journal entries about database tuning.',
        aiExplanation: 'Verified from 3 journal study logs detailing indexed joins and query execution plans.',
        tasks: [
          { id: 't-1', title: 'Complete Window Functions Coursework', completed: true, completedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
          { id: 't-2', title: 'Solve 10 LeetCode Database Problems', completed: true, completedAt: new Date(Date.now() - 86400000 * 13).toISOString() },
          { id: 't-3', title: 'Write SQL Performance Optimization Notes', completed: true, completedAt: new Date(Date.now() - 86400000 * 12).toISOString() },
        ],
      },
      {
        id: 'ms-2',
        title: 'Build End-to-End Data Pipeline',
        description: 'Design automated ingestion, DBT transformations, and scheduled BigQuery exports.',
        order: 2,
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
        targetDate: '2026-09-01',
        evidence: 'Deployed automated Cloud Run ETL worker and verified DBT models.',
        aiExplanation: 'Recorded architecture milestone in journal with attached pipeline diagram.',
        tasks: [
          { id: 't-4', title: 'Setup DBT schema transformations', completed: true, completedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
          { id: 't-5', title: 'Write data validation & anomaly alerts', completed: true, completedAt: new Date(Date.now() - 86400000 * 9).toISOString() },
        ],
      },
      {
        id: 'ms-3',
        title: 'Interactive Executive Analytics Dashboard',
        description: 'Build real-time revenue, churn, and cohort visualization in Looker Studio or React.',
        order: 3,
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        targetDate: '2026-09-20',
        evidence: 'Executive dashboard deployed with live streaming connectors.',
        aiExplanation: 'Completed dashboard verified by user testing session.',
        tasks: [
          { id: 't-6', title: 'Draft wireframes for cohort retention grid', completed: true, completedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
          { id: 't-7', title: 'Connect live BigQuery analytics views', completed: true, completedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
          { id: 't-8', title: 'Conduct user testing session', completed: true, completedAt: new Date(Date.now() - 86400000 * 6).toISOString() },
        ],
      },
      {
        id: 'ms-4',
        title: 'Machine Learning & Predictive Scoring',
        description: 'Implement customer lifetime value forecasting and churn prediction models.',
        order: 4,
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        targetDate: '2026-10-30',
        evidence: 'Trained XGBoost models achieving 94% accuracy score.',
        aiExplanation: 'Model evaluation notes recorded in canonical book memories.',
        tasks: [
          { id: 't-9', title: 'Feature engineering on customer activity', completed: true, completedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
          { id: 't-10', title: 'Train XGBoost & LightGBM benchmark models', completed: true, completedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        ],
      },
      {
        id: 'ms-5',
        title: 'Senior Portfolio Review & Certification',
        description: 'Publish open-source case studies, pass Google Cloud Professional Data Engineer exam.',
        order: 5,
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        targetDate: '2026-12-15',
        evidence: 'Passed GCP Data Engineer Exam and published GitHub portfolio.',
        aiExplanation: 'Verified senior data analytics credentials achieved!',
        tasks: [
          { id: 't-11', title: 'Complete GCP Cloud Engineer mock exams', completed: true, completedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
          { id: 't-12', title: 'Publish GitHub technical case study', completed: true, completedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-fitness-marathon',
    userId: uid,
    title: 'Run a Half Marathon in under 1h 45m',
    description: 'Build endurance, weekly cadence, structured interval training, and race day pacing.',
    category: 'Health & Wellness',
    status: 'active',
    progress: 0,
    targetDate: '2026-11-15',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'Circuit ready at starting line. Click checkpoints to record running achievements.',
    milestones: [
      {
        id: 'ms-f-1',
        title: 'Establish 20km Weekly Base Mileage',
        description: 'Consistent 3x weekly aerobic runs with heart rate below Zone 3.',
        order: 1,
        completed: false,
        targetDate: '2026-08-10',
        tasks: [
          { id: 'tf-1', title: 'Three 7km easy morning runs', completed: false },
          { id: 'tf-2', title: 'Foam rolling & mobility routine', completed: false },
        ],
      },
      {
        id: 'ms-f-2',
        title: 'Complete 14km Long Run at Race Pace',
        description: 'Target 4:55/km sustained pace with hydration checkpoint.',
        order: 2,
        completed: false,
        targetDate: '2026-09-15',
        tasks: [
          { id: 'tf-3', title: '10km tempo run on Wednesday', completed: false },
          { id: 'tf-4', title: '14km progressive Sunday endurance run', completed: false },
        ],
      },
      {
        id: 'ms-f-3',
        title: 'Threshold Interval Speed Sessions',
        description: '6x 1000m repeats at 4:30/km with 90s recovery jog.',
        order: 3,
        completed: false,
        targetDate: '2026-10-15',
        tasks: [
          { id: 'tf-5', title: 'Track workout session 1', completed: false },
          { id: 'tf-6', title: 'Track workout session 2', completed: false },
        ],
      },
      {
        id: 'ms-f-4',
        title: 'Race Day: Official Half Marathon',
        description: 'Execute race strategy, negative split pacing, and cross finish line sub-1:45.',
        order: 4,
        completed: false,
        targetDate: '2026-11-15',
        tasks: [
          { id: 'tf-7', title: 'Taper week carb load & sleep hygiene', completed: false },
          { id: 'tf-8', title: 'Official race checkpoint', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-fullstack-dev',
    userId: uid,
    title: 'Master Full-Stack Cloud Architecture',
    description: 'Build enterprise microservices, Docker containers, GraphQL gateways, and Cloud Run deployments.',
    category: 'Career & Growth',
    status: 'active',
    progress: 0,
    targetDate: '2026-12-01',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'ms-dev-1',
        title: 'Design Microservice System Schemas',
        description: 'Define TypeScript models, OpenAPI contracts, and Firestore security rules.',
        order: 1,
        completed: false,
        tasks: [
          { id: 'tdev-1', title: 'Draft OpenAPI spec for user API', completed: false },
          { id: 'tdev-2', title: 'Configure TypeScript build scripts', completed: false },
        ],
      },
      {
        id: 'ms-dev-2',
        title: 'Build Reactive Realtime Frontend',
        description: 'Implement Vite + React state management, Tailwind design system, and WebSockets.',
        order: 2,
        completed: false,
        tasks: [
          { id: 'tdev-3', title: 'Setup component library & dark mode', completed: false },
          { id: 'tdev-4', title: 'Connect Firestore live snapshot hooks', completed: false },
        ],
      },
      {
        id: 'ms-dev-3',
        title: 'Deploy Production Cloud Run Containers',
        description: 'Configure Docker builds, environment variables, and automated CI/CD pipelines.',
        order: 3,
        completed: false,
        tasks: [
          { id: 'tdev-5', title: 'Write production Dockerfile', completed: false },
          { id: 'tdev-6', title: 'Deploy service to Google Cloud Run', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-mindfulness',
    userId: uid,
    title: 'Daily Mindfulness & Emotional Wellness Routine',
    description: 'Sustain daily journaling, diaphragmatic breathing loops, and mood tracking.',
    category: 'Personal Growth',
    status: 'active',
    progress: 0,
    targetDate: '2026-10-31',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'ms-mind-1',
        title: 'Log 14 Consecutive Evening Journal Reflections',
        description: 'Write daily gratitude, mood tags, and emotional reflections.',
        order: 1,
        completed: false,
        tasks: [
          { id: 'tmind-1', title: 'Log 7 evening journal entries', completed: false },
          { id: 'tmind-2', title: 'Track daily energy and stress levels', completed: false },
        ],
      },
      {
        id: 'ms-mind-2',
        title: 'Master Diaphragmatic Box Breathing',
        description: 'Practice 10-minute daily breathing sessions with ambient soundscapes.',
        order: 2,
        completed: false,
        tasks: [
          { id: 'tmind-3', title: 'Complete 5 breathing audio sessions', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-read-books',
    userId: uid,
    title: 'Read 12 High-Impact Leadership & Tech Books',
    description: 'Expand mental models with canonical books tracked in digital library.',
    category: 'Personal Growth',
    status: 'active',
    progress: 0,
    targetDate: '2026-12-31',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'ms-book-1',
        title: 'Read "The Psychology of Money" by Morgan Housel',
        description: 'Log key quotes, summary insights, and financial takeaways.',
        order: 1,
        completed: false,
        tasks: [
          { id: 'tbook-1', title: 'Read chapters 1-10 & log highlights', completed: false },
          { id: 'tbook-2', title: 'Write book review in digital library', completed: false },
        ],
      },
      {
        id: 'ms-book-2',
        title: 'Read "Atomic Habits" by James Clear',
        description: 'Implement habit stacking and 1% incremental progress framework.',
        order: 2,
        completed: false,
        tasks: [
          { id: 'tbook-3', title: 'Identify cue, craving, response & reward loops', completed: false },
        ],
      },
    ],
  },
  {
    id: 'goal-f1-piano-music',
    userId: uid,
    title: 'Master Classical Piano & Music Composition',
    description: 'Learn chord progressions, sight reading, and record original piano melodies.',
    category: 'Creative Arts',
    status: 'active',
    progress: 0,
    targetDate: '2026-11-30',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [
      {
        id: 'ms-music-1',
        title: 'Master Major & Minor Scales in All Keys',
        description: 'Practice finger dexterity and scale arpeggios.',
        order: 1,
        completed: false,
        tasks: [
          { id: 'tmus-1', title: 'Practice C, G, D, A, E scales daily', completed: false },
          { id: 'tmus-2', title: 'Record 2-minute piano performance', completed: false },
        ],
      },
    ],
  },
];

/**
 * Calculate dynamic continuous goal progress percentage based on completed milestones & tasks
 */
export function calculateGoalProgress(goal: { milestones?: GoalMilestone[] }): number {
  if (!goal.milestones || goal.milestones.length === 0) return 0;
  
  let totalWeight = 0;
  let earnedWeight = 0;

  goal.milestones.forEach((m) => {
    const milestoneWeight = 10;
    totalWeight += milestoneWeight;

    if (m.completed) {
      earnedWeight += milestoneWeight;
    } else if (m.tasks && m.tasks.length > 0) {
      const completedTasks = m.tasks.filter((t) => t.completed).length;
      const partial = (completedTasks / m.tasks.length) * (milestoneWeight * 0.85);
      earnedWeight += partial;
    }
  });

  if (totalWeight === 0) return 0;
  return Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
}

/**
 * Fetch all canonical goal tracks for user
 */
export async function getGoalsForUser(uid: string): Promise<GoalTrack[]> {
  if (!uid) return [];

  const deletedSet = getDeletedGoalIds();
  const userCompletedMsSet = getUserCompletedMilestones(uid);

  // Check local storage cache first
  let cachedGoals: GoalTrack[] | null = null;
  const cached = localStorage.getItem(`${GOALS_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      cachedGoals = JSON.parse(cached);
    } catch {}
  }

  try {
    const ref = collection(db, 'users', uid, 'goals');
    const q = query(ref, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const filteredDocs = snapshot.docs.filter((d) => !deletedSet.has(d.id));

      const goals: GoalTrack[] = filteredDocs.map((d) => {
        const data = d.data();
        const goalId = d.id;

        // Ensure unique, domain-tailored checkpoints if missing or generic
        let rawMilestones = data.milestones || [];
        const isGeneric = rawMilestones.length === 0 || rawMilestones.some((m: any) => {
          const mTitle = (m.title || '').toLowerCase();
          return mTitle.includes('foundation & setup') || mTitle.includes('phase 1') || mTitle.includes('milestone 1') || mTitle.includes('core execution & focused practice');
        });

        if (isGeneric) {
          const tailored = generateTailoredCheckpointsForGoal(data.title || 'Goal', data.category || 'Career & Growth');
          rawMilestones = tailored.map((t, tIdx) => {
            const existingM = rawMilestones[tIdx];
            return {
              id: existingM?.id || `${goalId}_ms_${tIdx + 1}`,
              title: t.title,
              description: t.description,
              order: tIdx + 1,
              completed: Boolean(existingM?.completed),
              targetDate: existingM?.targetDate || t.targetDate,
              tasks: t.tasks.map((taskTitle, taskIdx) => ({
                id: `${goalId}_ms_${tIdx + 1}_t_${taskIdx + 1}`,
                title: taskTitle,
                completed: false,
              })),
            };
          });
        }

        const goal: GoalTrack = {
          id: goalId,
          userId: uid,
          title: data.title || 'Untitled Goal',
          description: data.description || '',
          category: data.category || 'Career & Growth',
          status: data.status || 'active',
          progress: data.progress ?? 0,
          milestones: rawMilestones.map((m: any, idx: number) => {
            const rawMId = m.id || `m-${idx + 1}`;
            const mId = rawMId.startsWith(goalId) ? rawMId : `${goalId}_${rawMId}`;
            const parsedTasks = (m.tasks || []).map((t: any, tIdx: number) => {
              const rawTId = t.id || `t-${idx + 1}-${tIdx + 1}`;
              const tId = rawTId.startsWith(mId) ? rawTId : `${mId}_${rawTId}`;
              const taskDone = Boolean(t.completed);
              return {
                id: tId,
                title: t.title || 'Action Item',
                completed: taskDone,
                completedAt: taskDone ? (t.completedAt || new Date().toISOString()) : undefined,
              };
            });

            const hasTasks = parsedTasks.length > 0;
            const allTasksDone = hasTasks && parsedTasks.every((t: any) => t.completed);
            
            // Respect stored completion state
            let isCompleted = Boolean(m.completed);
            if (hasTasks && allTasksDone) {
              isCompleted = true;
            } else if (hasTasks && parsedTasks.some((t: any) => !t.completed) && !m.completed) {
              isCompleted = false;
            }

            return {
              id: mId,
              title: m.title || `Milestone ${idx + 1}`,
              description: m.description || '',
              order: m.order ?? idx + 1,
              completed: isCompleted,
              completedAt: isCompleted ? (m.completedAt || new Date().toISOString()) : undefined,
              targetDate: m.targetDate || undefined,
              evidence: m.evidence || undefined,
              aiExplanation: m.aiExplanation || undefined,
              tasks: parsedTasks,
            };
          }),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
          targetDate: data.targetDate || '',
          relatedJournalIds: data.relatedJournalIds || [],
          relatedCalendarIds: data.relatedCalendarIds || [],
          relatedBookIds: data.relatedBookIds || [],
          relatedMoodIds: data.relatedMoodIds || [],
          relatedMemoryIds: data.relatedMemoryIds || [],
          aiNotes: data.aiNotes || undefined,
        };
        goal.progress = calculateGoalProgress(goal);
        goal.status = goal.progress >= 100 ? 'completed' : 'active';
        return goal;
      });

      // Ensure key domain circuits (Hackathon, CEO, Interview, AI Agent Developer) are available
      const defaultDomainTracks = DEFAULT_GOALS(uid);
      defaultDomainTracks.forEach((defG) => {
        if (!deletedSet.has(defG.id)) {
          const alreadyExists = goals.some((g) =>
            g.id === defG.id || g.title.toLowerCase().trim() === defG.title.toLowerCase().trim()
          );
          if (!alreadyExists) {
            goals.push(defG);
          }
        }
      });

      localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(goals));
      return goals;
    } else {
      // Empty snapshot: Seed default goals to Firestore so documents exist permanently
      const defaults = DEFAULT_GOALS(uid).filter((g) => !deletedSet.has(g.id));
      try {
        for (const g of defaults) {
          const docRef = doc(db, 'users', uid, 'goals', g.id);
          await setDoc(docRef, sanitizeForFirestore({
            ...g,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }), { merge: true });
        }
      } catch (seedErr) {
        console.warn('[goalsService] Error seeding default goals to Firestore:', seedErr);
      }
      localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(defaults));
      return defaults;
    }
  } catch (err) {
    console.warn('[goalsService] Firestore fetch error, checking local storage:', err);
  }

  if (cachedGoals && cachedGoals.length > 0) {
    const list: GoalTrack[] = cachedGoals
      .filter((g) => !deletedSet.has(g.id))
      .map((g) => {
        let rawMilestones = g.milestones || [];
        const isGeneric = rawMilestones.length === 0 || rawMilestones.some((m: any) => {
          const mTitle = (m.title || '').toLowerCase();
          return mTitle.includes('foundation & setup') || mTitle.includes('phase 1') || mTitle.includes('milestone 1') || mTitle.includes('core execution & focused practice');
        });

        if (isGeneric) {
          const tailored = generateTailoredCheckpointsForGoal(g.title || 'Goal', g.category || 'Career & Growth');
          rawMilestones = tailored.map((t, tIdx) => {
            const existingM = rawMilestones[tIdx];
            return {
              id: existingM?.id || `${g.id}_ms_${tIdx + 1}`,
              title: t.title,
              description: t.description,
              order: tIdx + 1,
              completed: Boolean(existingM?.completed),
              targetDate: existingM?.targetDate || t.targetDate,
              tasks: t.tasks.map((taskTitle, taskIdx) => ({
                id: `${g.id}_ms_${tIdx + 1}_t_${taskIdx + 1}`,
                title: taskTitle,
                completed: false,
              })),
            };
          });
        }

        const sanitizedMilestones = rawMilestones.map((m) => {
          const parsedTasks = (m.tasks || []).map((t: any) => ({
            ...t,
            completed: Boolean(t.completed),
          }));
          const hasTasks = parsedTasks.length > 0;
          const allTasksDone = hasTasks && parsedTasks.every((t: any) => t.completed);
          let isCompleted = Boolean(m.completed);
          if (hasTasks && allTasksDone) {
            isCompleted = true;
          }

          return {
            ...m,
            completed: isCompleted,
            completedAt: isCompleted ? (m.completedAt || new Date().toISOString()) : undefined,
            tasks: parsedTasks,
          };
        });

        const progress = calculateGoalProgress({ milestones: sanitizedMilestones });
        return {
          ...g,
          milestones: sanitizedMilestones,
          progress,
          status: progress >= 100 ? ('completed' as const) : ('active' as const),
        };
      });

    // Ensure all 4 domain circuits are available in cache
    const defaultDomainTracks = DEFAULT_GOALS(uid);
    defaultDomainTracks.forEach((defG) => {
      if (!deletedSet.has(defG.id)) {
        const alreadyExists = list.some((g) =>
          g.id === defG.id || g.title.toLowerCase().trim() === defG.title.toLowerCase().trim()
        );
        if (!alreadyExists) {
          list.push(defG);
        }
      }
    });

    return list;
  }

  const defaults = DEFAULT_GOALS(uid).filter((g) => !deletedSet.has(g.id));
  localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(defaults));
  return defaults;
}

/**
 * Create a new goal track (Human-in-control approved)
 */
export async function createGoalTrack(
  uid: string,
  data: {
    title: string;
    description?: string;
    category?: string;
    targetDate?: string;
    initialMilestones?: Array<{ title: string; description: string; targetDate?: string }>;
  }
): Promise<GoalTrack> {
  const newId = 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  
  let milestones: GoalMilestone[] = [];
  if (data.initialMilestones && data.initialMilestones.length > 0) {
    milestones = data.initialMilestones.map((m, idx) => ({
      id: `${newId}_ms_${idx + 1}`,
      title: m.title,
      description: m.description,
      order: idx + 1,
      completed: false,
      targetDate: m.targetDate || '',
      tasks: [
        { id: `${newId}_ms_${idx + 1}_t_1`, title: `Draft action plan for ${m.title}`, completed: false }
      ],
    }));
  } else {
    const tailored = generateTailoredCheckpointsForGoal(data.title, data.category);
    milestones = tailored.map((m, idx) => ({
      id: `${newId}_ms_${idx + 1}`,
      title: m.title,
      description: m.description,
      order: idx + 1,
      completed: false,
      targetDate: m.targetDate || '',
      tasks: (m.tasks && m.tasks.length > 0 ? m.tasks : [`Draft action plan for ${m.title}`]).map((tText, tIdx) => ({
        id: `${newId}_ms_${idx + 1}_t_${tIdx + 1}`,
        title: tText,
        completed: false,
      })),
    }));
  }

  const newGoal: GoalTrack = {
    id: newId,
    userId: uid,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    category: data.category || 'Career & Growth',
    status: 'active',
    progress: 0,
    targetDate: data.targetDate || '',
    milestones,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    relatedJournalIds: [],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: 'New canonical goal track created. AI will ground milestone recommendations in your journals.',
  };

  try {
    const ref = doc(db, 'users', uid, 'goals', newId);
    await setDoc(ref, sanitizeForFirestore({
      ...newGoal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true });
  } catch (err) {
    console.warn('[goalsService] Firestore create failed, saving local:', err);
  }

  const existing = await getGoalsForUser(uid);
  const updated = [...existing.filter((g) => g.id !== newGoal.id), newGoal];
  localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(updated));

  return newGoal;
}

/**
 * Update an existing Goal Track with automatic sanitization and setDoc merge
 */
export async function updateGoalTrack(
  uid: string,
  goalId: string,
  updates: Partial<GoalTrack>
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const current = existing.find((g) => g.id === goalId);
  if (!current) throw new Error(`Goal ${goalId} not found`);

  const merged: GoalTrack = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  merged.progress = calculateGoalProgress(merged);
  if (merged.progress >= 100) {
    merged.status = 'completed';
  } else if (merged.status === 'completed' && merged.progress < 100) {
    merged.status = 'active';
  }

  // Update local storage cache immediately
  const updatedList = existing.map((g) => (g.id === goalId ? merged : g));
  localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(updatedList));

  // Persist reliably to Firestore using setDoc with merge: true
  try {
    const ref = doc(db, 'users', uid, 'goals', goalId);
    const sanitized = sanitizeForFirestore({
      ...merged,
      updatedAt: serverTimestamp(),
    });
    await setDoc(ref, sanitized, { merge: true });
  } catch (err) {
    console.warn('[goalsService] Firestore setDoc error:', err);
  }

  // Notify all listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pgj_goals_updated'));
  }

  return merged;
}

/**
 * Toggle Milestone Completion State (Human-in-control)
 */
export async function toggleMilestoneCompletion(
  uid: string,
  goalId: string,
  milestoneId: string,
  explicitState?: boolean
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const updatedMilestones = goal.milestones.map((m) => {
    if (m.id === milestoneId) {
      const nextCompleted = explicitState !== undefined ? explicitState : !m.completed;
      const nowStr = new Date().toISOString();

      recordUserCompletedMilestone(uid, milestoneId, nextCompleted);

      // If completing milestone, ensure all tasks are marked complete
      const updatedTasks = nextCompleted
        ? (m.tasks && m.tasks.length > 0
            ? m.tasks.map((t) => ({
                ...t,
                completed: true,
                completedAt: t.completedAt || nowStr,
              }))
            : [{ id: `t_${Date.now()}_1`, title: `Complete milestone requirements`, completed: true, completedAt: nowStr }])
        : (m.tasks || []).map((t) => ({ ...t, completed: false, completedAt: undefined }));

      return {
        ...m,
        completed: nextCompleted,
        completedAt: nextCompleted ? (m.completedAt || nowStr) : undefined,
        evidence: nextCompleted ? (m.evidence || 'Milestone confirmed complete by user action.') : m.evidence,
        tasks: updatedTasks,
      };
    }
    return m;
  });

  return updateGoalTrack(uid, goalId, { milestones: updatedMilestones });
}

/**
 * Toggle all tasks in a milestone at once (Select All / Deselect All)
 */
export async function toggleAllMilestoneTasks(
  uid: string,
  goalId: string,
  milestoneId: string,
  markAllComplete: boolean
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const updatedMilestones = goal.milestones.map((m) => {
    if (m.id === milestoneId) {
      const nowStr = new Date().toISOString();
      const updatedTasks = (m.tasks || []).map((t) => ({
        ...t,
        completed: markAllComplete,
        completedAt: markAllComplete ? (t.completedAt || nowStr) : undefined,
      }));

      const isCompleted = markAllComplete;

      return {
        ...m,
        tasks: updatedTasks,
        completed: isCompleted,
        completedAt: isCompleted ? (m.completedAt || nowStr) : undefined,
        evidence: markAllComplete
          ? (m.evidence || 'All checkpoint action items confirmed complete by user.')
          : m.evidence,
      };
    }
    return m;
  });

  return updateGoalTrack(uid, goalId, { milestones: updatedMilestones });
}

/**
 * Toggle a specific subtask inside a milestone
 */
export async function toggleMilestoneTask(
  uid: string,
  goalId: string,
  milestoneId: string,
  taskId: string
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const updatedMilestones = goal.milestones.map((m) => {
    if (m.id === milestoneId) {
      const nowStr = new Date().toISOString();
      const updatedTasks = (m.tasks || []).map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? nowStr : undefined,
          };
        }
        return t;
      });

      // If all subtasks become completed, auto-mark milestone complete; if any incomplete, mark incomplete
      const hasTasks = updatedTasks.length > 0;
      const allTasksDone = hasTasks && updatedTasks.every((t) => t.completed);
      const isCompleted = hasTasks ? allTasksDone : m.completed;

      return {
        ...m,
        tasks: updatedTasks,
        completed: isCompleted,
        completedAt: isCompleted ? (m.completedAt || nowStr) : undefined,
      };
    }
    return m;
  });

  return updateGoalTrack(uid, goalId, { milestones: updatedMilestones });
}

/**
 * Add a new task to a milestone
 */
export async function addMilestoneTask(
  uid: string,
  goalId: string,
  milestoneId: string,
  taskTitle: string
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const newTask: GoalTaskItem = {
    id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    title: taskTitle.trim(),
    completed: false,
  };

  const updatedMilestones = goal.milestones.map((m) => {
    if (m.id === milestoneId) {
      return {
        ...m,
        tasks: [...(m.tasks || []), newTask],
      };
    }
    return m;
  });

  return updateGoalTrack(uid, goalId, { milestones: updatedMilestones });
}

export async function deleteMilestoneTask(
  uid: string,
  goalId: string,
  milestoneId: string,
  taskId: string
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const updatedMilestones = goal.milestones.map((m) => {
    if (m.id === milestoneId) {
      const updatedTasks = (m.tasks || []).filter((t) => t.id !== taskId);
      return {
        ...m,
        tasks: updatedTasks,
      };
    }
    return m;
  });

  return updateGoalTrack(uid, goalId, { milestones: updatedMilestones });
}

/**
 * Add a new milestone to a goal track
 */
export async function addMilestoneToGoal(
  uid: string,
  goalId: string,
  data: { title: string; description: string; targetDate?: string }
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const newMilestone: GoalMilestone = {
    id: `ms_${Date.now()}`,
    title: data.title.trim(),
    description: data.description.trim(),
    order: goal.milestones.length + 1,
    completed: false,
    targetDate: data.targetDate || '',
    tasks: [
      { id: `t_${Date.now()}_1`, title: `Implement deliverables for ${data.title.trim()}`, completed: false }
    ],
  };

  return updateGoalTrack(uid, goalId, {
    milestones: [...goal.milestones, newMilestone],
  });
}

/**
 * Delete a Goal Track
 */
export async function deleteGoalTrack(uid: string, goalId: string): Promise<void> {
  recordDeletedGoalId(goalId);

  const cacheKey = `${GOALS_CACHE_PREFIX}${uid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const existing: GoalTrack[] = JSON.parse(cached);
      const updated = existing.filter((g) => g.id !== goalId);
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    } catch {}
  }

  // Also remove from active goal if it was the selected goal
  try {
    const activeCached = localStorage.getItem(`pgj_active_goal_${uid}`);
    if (activeCached === goalId) {
      localStorage.removeItem(`pgj_active_goal_${uid}`);
    }
  } catch {}

  try {
    if (db) {
      const ref = doc(db, 'users', uid, 'goals', goalId);
      await deleteDoc(ref);
    }
  } catch (err) {
    console.warn('[goalsService] Firestore delete error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pgj_goals_updated', { detail: { deletedGoalId: goalId } }));
  }
}

/**
 * Detect potential goals from journal entries with human confirmation
 */
export function detectGoalsFromJournals(
  journals: JournalEntry[],
  existingGoals: GoalTrack[]
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const existingTitles = existingGoals.map((g) => g.title.toLowerCase());

  journals.forEach((j) => {
    const text = (j.title + ' ' + j.content).toLowerCase();

    // Priority domain-specific recognizers
    const domainMatchers: Array<{ test: boolean; title: string }> = [
      {
        test: text.includes('hackathon') || (text.includes('gen ai') && (text.includes('win') || text.includes('build'))) || text.includes('google gen ai'),
        title: 'Win Google Gen AI Hackathon',
      },
      {
        test: text.includes('become ceo') || text.includes('chief executive') || text.includes('run my startup') || text.includes('scale startup'),
        title: 'Become CEO',
      },
      {
        test: text.includes('interview') || text.includes('prepare for interview') || text.includes('mock interview') || text.includes('job offer'),
        title: 'Prepare for Interview',
      },
      {
        test: text.includes('ai agent') || text.includes('agent developer') || text.includes('llm agent') || text.includes('autonomous agent'),
        title: 'Become AI Agent Developer',
      },
    ];

    for (const dm of domainMatchers) {
      if (dm.test) {
        const candidateLower = dm.title.toLowerCase();
        const isDuplicate = existingTitles.some((t) => t.includes(candidateLower) || candidateLower.includes(t));
        if (!isDuplicate && !suggestions.some((s) => s.title.toLowerCase() === candidateLower)) {
          suggestions.push({
            id: `sug_goal_domain_${j.id}_${suggestions.length}`,
            type: 'goal',
            title: dm.title,
            description: `Auto-identified priority circuit from journal entry: "${j.title}"`,
            status: 'pending',
            sourceJournalId: j.id,
            sourceJournalTitle: j.title,
            journalExcerpt: j.content.slice(0, 160),
          });
        }
      }
    }

    // Comprehensive regex heuristics for goal extraction
    const patterns = [
      { pattern: /(?:want to learn|started learning|learning|study|studying)\s+([a-z0-9\s\+\#\.\-]+)/i, prefix: 'Master ' },
      { pattern: /(?:want to become|aim to become|plan to become)\s+([a-z0-9\s\-]+)/i, prefix: 'Become a ' },
      { pattern: /(?:my goal is to|our goal is to|goal is to|goal:)\s*([a-z0-9\s\-]+)/i, prefix: 'Achieve ' },
      { pattern: /(?:training for|prepare for|preparing for)\s+([a-z0-9\s\-]+)/i, prefix: 'Train for ' },
      { pattern: /(?:aiming to complete|plan to complete|finish)\s+([a-z0-9\s\-]+)/i, prefix: 'Complete ' },
      { pattern: /(?:plan to build|decided to build|building a|building)\s+([a-z0-9\s\-]+)/i, prefix: 'Build ' },
      { pattern: /(?:decided to|committed to)\s+([a-z0-9\s\-]+)/i, prefix: 'Accomplish ' },
      { pattern: /(?:save|invest)\s+(\$?\d+[\d,k\s\w]*)/i, prefix: 'Save Financial Target ' },
    ];

    patterns.forEach(({ pattern, prefix }) => {
      const match = (j.content + ' ' + j.title).match(pattern);
      if (match && match[1]) {
        let extracted = match[1].split(/[\.\,\;\!\?\n]/)[0].trim();
        if (extracted.length > 40) extracted = extracted.slice(0, 40).trim();
        if (extracted.length < 3) return;

        const goalCandidate = `${prefix}${extracted}`;
        const candidateLower = goalCandidate.toLowerCase();
        
        // Ensure no duplicate with existing canonical goals
        const isDuplicate = existingTitles.some((t) => t.includes(candidateLower) || candidateLower.includes(t) || t.includes(extracted.toLowerCase()));
        if (!isDuplicate && !suggestions.some((s) => s.title.toLowerCase() === candidateLower)) {
          suggestions.push({
            id: `sug_goal_${j.id}_${suggestions.length}`,
            type: 'goal',
            title: goalCandidate,
            description: `Identified from journal entry: "${j.title}" (${new Date(j.createdAt).toLocaleDateString()})`,
            status: 'pending',
            sourceJournalId: j.id,
            sourceJournalTitle: j.title,
            journalExcerpt: j.content.slice(0, 160),
          });
        }
      }
    });
  });

  return suggestions.slice(0, 5);
}

/**
 * Append timestamped journal evidence to an existing Goal Track on the F1 Track
 */
export async function appendEvidenceToGoal(
  uid: string,
  goalId: string,
  evidenceData: {
    journalId: string;
    journalTitle: string;
    journalContent: string;
    timestamp?: string;
  }
): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const ts = evidenceData.timestamp || new Date().toISOString();
  const dateStr = new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const excerpt = evidenceData.journalContent.length > 150
    ? evidenceData.journalContent.slice(0, 150) + '...'
    : evidenceData.journalContent;

  const newEvidenceLine = `• [${dateStr}] Journal "${evidenceData.journalTitle}": "${excerpt}"`;

  // Update relatedJournalIds array
  const updatedJournalIds = Array.from(new Set([...(goal.relatedJournalIds || []), evidenceData.journalId]));

  // Update milestones by attaching evidence to the active milestone
  const milestones = [...(goal.milestones || [])];
  const activeMilestoneIndex = milestones.findIndex((m) => !m.completed) >= 0
    ? milestones.findIndex((m) => !m.completed)
    : Math.max(0, milestones.length - 1);

  if (milestones[activeMilestoneIndex]) {
    const targetM = milestones[activeMilestoneIndex];
    const existingEv = targetM.evidence || '';
    const updatedEv = existingEv ? `${existingEv}\n${newEvidenceLine}` : newEvidenceLine;

    milestones[activeMilestoneIndex] = {
      ...targetM,
      evidence: updatedEv,
      aiExplanation: `Evidence automatically recorded from journal entry "${evidenceData.journalTitle}" on ${dateStr}.`,
    };
  }

  const updatedAiNotes = `Last updated with journal evidence on ${dateStr}: "${evidenceData.journalTitle}"`;

  const updatedGoal = await updateGoalTrack(uid, goalId, {
    relatedJournalIds: updatedJournalIds,
    milestones,
    aiNotes: updatedAiNotes,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pgj_goals_updated', { detail: { goalId: updatedGoal.id, updatedGoal } }));
  }

  return updatedGoal;
}

/**
 * Generate high-quality, domain-specific checkpoints for any goal
 */
export function generateTailoredCheckpointsForGoal(title: string, category: string = ''): Array<{
  title: string;
  description: string;
  targetDate: string;
  tasks: string[];
}> {
  const t = (title || '').toLowerCase();
  const now = Date.now();
  const addDays = (days: number) => new Date(now + days * 86400000).toISOString().slice(0, 10);

  if (t.includes('hackathon') || t.includes('contest') || t.includes('competition')) {
    return [
      {
        title: 'Idea Validation, System Architecture & Challenge Specification',
        description: `Analyze judging rubrics, outline winning differentiators, and establish tech stack for ${title}.`,
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
    ];
  }

  if (t.includes('ceo') || t.includes('leadership') || t.includes('executive') || t.includes('founder') || t.includes('startup')) {
    return [
      {
        title: 'Define Strategic Vision, Market Moat & Operating Philosophy',
        description: `Draft company mission, product-market fit metrics, and competitive differentiation for ${title}.`,
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
    ];
  }

  if (t.includes('interview') || t.includes('job') || t.includes('career') || t.includes('resume')) {
    return [
      {
        title: 'Resume & High-Impact Case Study Portfolio Overhaul',
        description: `Update portfolio and quantify business impact metrics specifically aligned with ${title}.`,
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
    ];
  }

  if (t.includes('agent') || t.includes('ai') || t.includes('llm') || t.includes('gemini') || t.includes('deep learning')) {
    return [
      {
        title: 'Master LLM Foundations & Tool Calling Protocols',
        description: `Implement JSON schema definitions, function-calling loops, and structured output parsing tailored to ${title}.`,
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
        description: `Deploy high-performance containerized agent architecture for "${title}" with live telemetry.`,
        targetDate: addDays(75),
        tasks: ['Deploy Docker container to Cloud Run', 'Monitor live trace telemetry & user sessions'],
      },
    ];
  }

  if (t.includes('run') || t.includes('marathon') || t.includes('fitness') || t.includes('workout') || t.includes('health') || t.includes('gym')) {
    return [
      {
        title: 'Establish Baseline Physiology & Weekly Consistency',
        description: `Build foundation habits and schedule weekly training blocks targeting ${title}.`,
        targetDate: addDays(14),
        tasks: ['Log initial biometric benchmarks', 'Complete 3 structured training sessions per week'],
      },
      {
        title: 'Progressive Intensity & Performance Conditioning',
        description: 'Increase training volume safely while tracking recovery and heart-rate metrics.',
        targetDate: addDays(35),
        tasks: ['Hit 60% of target capacity threshold', 'Refine nutrition, hydration, and sleep hygiene'],
      },
      {
        title: 'Full Simulation & Peak Stamina Benchmark',
        description: 'Execute race-pace simulation test and validate mental resilience under pressure.',
        targetDate: addDays(60),
        tasks: ['Complete dress rehearsal simulation', 'Adjust recovery protocols'],
      },
      {
        title: 'Championship Event & Official Goal Achievement',
        description: `Cross the finish line and accomplish the primary objective for ${title}!`,
        targetDate: addDays(80),
        tasks: ['Follow pre-event taper schedule', 'Achieve and document final goal milestone'],
      },
    ];
  }

  const cleanTitle = (title || '').trim();
  return [
    {
      title: `Phase 1: Foundation & Setup for ${cleanTitle}`,
      description: `Establish core prerequisites, tools, and strategic baseline needed to achieve ${cleanTitle}.`,
      targetDate: addDays(14),
      tasks: ['Define scope, research prerequisites, and set initial timeline', 'Complete foundational setup and initial milestone'],
    },
    {
      title: `Phase 2: Core Execution & Focused Practice for ${cleanTitle}`,
      description: 'Commit to focused execution, logging daily progress and overcoming initial obstacles.',
      targetDate: addDays(35),
      tasks: ['Execute primary core phase of the goal', 'Track progress metrics and optimize strategy'],
    },
    {
      title: `Phase 3: Advanced Optimization & Benchmark Testing for ${cleanTitle}`,
      description: 'Refine techniques, validate quality against real-world standards, and harden capabilities.',
      targetDate: addDays(60),
      tasks: ['Run benchmark evaluations and stress tests', 'Resolve key bottlenecks'],
    },
    {
      title: `Phase 4: Final Mastery & Milestone Celebration for ${cleanTitle}`,
      description: `Complete final deliverables, achieve official mastery, and integrate learnings into long-term habits.`,
      targetDate: addDays(85),
      tasks: ['Finalize and review comprehensive goal outcome', 'Document achievement and celebrate completion'],
    },
  ];
}

/**
 * Automatically create and append a new Goal Track from journal entry identification
 * AI automatically generates unique, domain-specific checkpoints for the goal
 */
export async function autoCreateGoalFromJournal(
  uid: string,
  goalData: {
    title: string;
    description?: string;
    category?: string;
    milestones?: Array<{ title: string; description: string; targetDate?: string }>;
    journalId: string;
    journalTitle: string;
    journalContent: string;
    timestamp?: string;
  }
): Promise<GoalTrack> {
  const ts = goalData.timestamp || new Date().toISOString();
  const dateStr = new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const excerpt = goalData.journalContent.length > 160
    ? goalData.journalContent.slice(0, 160) + '...'
    : goalData.journalContent;

  const initialEvidence = `• [${dateStr}] Initial evidence from journal entry "${goalData.journalTitle}": "${excerpt}"`;

  // Determine category based on title
  const titleLower = goalData.title.toLowerCase();
  let category = goalData.category || 'Career & Growth';
  if (titleLower.includes('run') || titleLower.includes('health') || titleLower.includes('gym') || titleLower.includes('diet') || titleLower.includes('sleep') || titleLower.includes('marathon') || titleLower.includes('fitness')) {
    category = 'Health & Wellness';
  } else if (titleLower.includes('learn') || titleLower.includes('study') || titleLower.includes('read') || titleLower.includes('course') || titleLower.includes('python') || titleLower.includes('sql') || titleLower.includes('code') || titleLower.includes('react') || titleLower.includes('cloud')) {
    category = 'Learning & Skills';
  } else if (titleLower.includes('save') || titleLower.includes('budget') || titleLower.includes('invest') || titleLower.includes('money') || titleLower.includes('financial')) {
    category = 'Finance & Wealth';
  } else if (titleLower.includes('mind') || titleLower.includes('meditat') || titleLower.includes('peace') || titleLower.includes('journal')) {
    category = 'Mindfulness';
  }

  // Calculate target date ~90 days out
  const targetDateObj = new Date(Date.now() + 86400000 * 90);
  const targetDateStr = targetDateObj.toISOString().slice(0, 10);

  const newId = 'goal_f1_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // Generate unique, domain-tailored checkpoints automatically via AI or domain engine
  let checkpointTemplates: Array<{ title: string; description: string; targetDate?: string; tasks?: string[] }> = [];

  const providedSpecific = goalData.milestones && Array.isArray(goalData.milestones) && goalData.milestones.length > 0 &&
    !goalData.milestones.some((m) => m.title.toLowerCase().includes('foundation & setup') || m.title.toLowerCase().includes('milestone 1'));

  if (providedSpecific && goalData.milestones) {
    checkpointTemplates = goalData.milestones.map((m) => ({
      title: m.title,
      description: m.description,
      targetDate: m.targetDate,
      tasks: [`Complete core deliverable for ${m.title}`, `Verify and document progress in journal`],
    }));
  } else {
    try {
      const aiResult = await generateGoalCheckpointsWithGemini({
        title: goalData.title,
        description: goalData.description || `Identified from journal: ${goalData.journalTitle}`,
        category,
      });
      if (aiResult && aiResult.checkpoints && aiResult.checkpoints.length > 0) {
        checkpointTemplates = aiResult.checkpoints;
      }
    } catch (aiErr) {
      console.warn('[goalsService] Gemini checkpoints call fallback to domain engine:', aiErr);
    }

    if (!checkpointTemplates || checkpointTemplates.length === 0) {
      checkpointTemplates = generateTailoredCheckpointsForGoal(goalData.title, category);
    }
  }

  const initialMilestones: GoalMilestone[] = checkpointTemplates.map((m, idx) => {
    const msId = `${newId}_ms_${idx + 1}`;
    const rawTasks = m.tasks && m.tasks.length > 0
      ? m.tasks
      : [`Execute key action for ${m.title}`, `Log verified evidence in journal`];

    const tasks: GoalTaskItem[] = rawTasks.map((tText, tIdx) => ({
      id: `${msId}_t_${tIdx + 1}`,
      title: typeof tText === 'string' ? tText : (tText as any).title || `Action step ${tIdx + 1}`,
      completed: false,
    }));

    return {
      id: msId,
      title: m.title || `Checkpoint ${idx + 1}`,
      description: m.description || `Execute core objectives for stage ${idx + 1}.`,
      order: idx + 1,
      completed: false,
      targetDate: m.targetDate || new Date(Date.now() + 86400000 * (25 * (idx + 1))).toISOString().slice(0, 10),
      evidence: idx === 0 ? initialEvidence : undefined,
      aiExplanation: idx === 0 ? `Goal automatically identified from journal entry "${goalData.journalTitle}" on ${dateStr} with AI-generated roadmap checkpoints.` : undefined,
      tasks,
    };
  });

  const newGoal: GoalTrack = {
    id: newId,
    userId: uid,
    title: goalData.title.trim(),
    description: goalData.description || `Automatically identified from journal entry: "${goalData.journalTitle}"`,
    category,
    status: 'active',
    progress: 0,
    targetDate: targetDateStr,
    milestones: initialMilestones,
    createdAt: ts,
    updatedAt: ts,
    relatedJournalIds: [goalData.journalId],
    relatedMemoryIds: [],
    relatedCalendarIds: [],
    relatedBookIds: [],
    aiNotes: `Goal automatically created from journal entry "${goalData.journalTitle}" with timestamp ${dateStr}. Checkpoints generated by AI.`,
  };

  // Persist directly using setDoc so the ID is deterministic across local & Firestore
  try {
    const docRef = doc(db, 'users', uid, 'goals', newId);
    await setDoc(docRef, sanitizeForFirestore({
      ...newGoal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  } catch (err) {
    console.warn('[goalsService] Firestore create auto goal failed, saving local:', err);
  }

  // Update local storage cache and set active goal
  let existing: GoalTrack[] = [];
  const cached = localStorage.getItem(`${GOALS_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      existing = JSON.parse(cached);
    } catch {}
  }
  if (!existing.length) {
    existing = DEFAULT_GOALS(uid);
  }

  const updated = [newGoal, ...existing.filter((g) => g.id !== newGoal.id && g.id !== newId)];
  localStorage.setItem(`${GOALS_CACHE_PREFIX}${uid}`, JSON.stringify(updated));
  localStorage.setItem(`pgj_active_goal_${uid}`, newGoal.id);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pgj_goals_updated', { detail: { goalId: newGoal.id, newGoal } }));
  }

  return newGoal;
}

/**
 * Reset progress on a single goal circuit (mark all milestones & tasks incomplete)
 */
export async function resetGoalProgress(uid: string, goalId: string): Promise<GoalTrack> {
  const existing = await getGoalsForUser(uid);
  const goal = existing.find((g) => g.id === goalId);
  if (!goal) throw new Error(`Goal ${goalId} not found`);

  const resetMilestones = (goal.milestones || []).map((m) => ({
    ...m,
    completed: false,
    completedAt: undefined,
    tasks: (m.tasks || []).map((t) => ({
      ...t,
      completed: false,
      completedAt: undefined,
    })),
  }));

  return updateGoalTrack(uid, goalId, {
    milestones: resetMilestones,
    status: 'active',
    progress: 0,
  });
}

/**
 * Reset progress on all goal circuits for user
 */
export async function resetAllGoalsProgress(uid: string): Promise<GoalTrack[]> {
  const existing = await getGoalsForUser(uid);
  const updatedList: GoalTrack[] = [];
  for (const g of existing) {
    const resetMilestones = (g.milestones || []).map((m) => ({
      ...m,
      completed: false,
      completedAt: undefined,
      tasks: (m.tasks || []).map((t) => ({
        ...t,
        completed: false,
        completedAt: undefined,
      })),
    }));
    const updated = await updateGoalTrack(uid, g.id, {
      milestones: resetMilestones,
      status: 'active',
      progress: 0,
    });
    updatedList.push(updated);
  }
  return updatedList;
}
