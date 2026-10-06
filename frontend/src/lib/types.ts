export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

/* ── Roadmaps ── */
export interface RoadmapResponse {
  id: number;
  title: string;
  description: string | null;
  tag: string | null;
  colorTheme: string;
  archived: boolean;
  topicCount: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapRequest {
  title: string;
  description?: string;
  tag?: string;
  colorTheme?: string;
}

export type ColorTone = "moss" | "ember" | "gold";

export function colorThemeToTone(colorTheme: string): ColorTone {
  return colorTheme.toLowerCase() as ColorTone;
}

export const ROADMAP_COLORS: { value: string; label: string; tone: ColorTone }[] = [
  { value: "MOSS", label: "Moss", tone: "moss" },
  { value: "EMBER", label: "Ember", tone: "ember" },
  { value: "GOLD", label: "Gold", tone: "gold" },
];

/* ── Topics ── */
export interface TopicResponse {
  id: number;
  roadmapId: number;
  title: string;
  description: string | null;
  status: string;
  difficulty: number;
  estHours: number;
  sortOrder: number;
  parentId: number | null;
  sourceRef: string | null;
  milestoneLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopicRequest {
  title: string;
  description?: string;
  status: string;
  difficulty: number;
  estHours: number;
  sortOrder: number;
  milestoneLabel?: string;
}

export const TOPIC_STATUSES: { value: string; label: string; color: string }[] = [
  { value: "NOT_STARTED", label: "Not started", color: "slate" },
  { value: "IN_PROGRESS", label: "In progress", color: "ember" },
  { value: "REVISION", label: "Revision", color: "gold" },
  { value: "COMPLETED", label: "Completed", color: "moss" },
  { value: "DONE", label: "Completed", color: "moss" },
  { value: "CURRENT", label: "In progress", color: "ember" },
  { value: "UPCOMING", label: "Up next", color: "slate" },
  { value: "LOCKED", label: "Locked", color: "slate" },
];

export function isTopicCompleted(status: string): boolean {
  return status === "COMPLETED" || status === "DONE";
}

/* ── Checklist ── */
export interface ChecklistItemResponse {
  id: number;
  topicId: number;
  label: string;
  completed: boolean;
  sortOrder: number;
}

export interface ChecklistItemRequest {
  label: string;
  completed: boolean;
  sortOrder: number;
}

/* ── Topic Links (Obsidian) ── */
export interface TopicLinkResponse {
  id: number;
  topicId: number;
  label: string;
  uri: string;
  createdAt: string;
}

export interface TopicLinkRequest {
  label: string;
  uri: string;
}

/* ── Resources ── */
export interface ResourceResponse {
  id: number;
  title: string;
  type: string;
  url: string | null;
  tags: string[];
  rating: number;
  bookmarked: boolean;
  completed: boolean;
  duration: string | null;
  roadmapId: number | null;
  topicId: number | null;
  status: string;
  favorite: boolean;
  hidden: boolean;
  progressPercent: number;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  startedAt: string | null;
  completedAt: string | null;
  lastPage: number | null;
  videoPositionSeconds: number | null;
  readingProgress: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceRequest {
  title: string;
  type: string;
  url?: string;
  tags?: string[];
  rating: number;
  bookmarked: boolean;
  completed: boolean;
  duration?: string;
  roadmapId?: number;
  topicId?: number;
  status?: string;
  favorite?: boolean;
  hidden?: boolean;
  progressPercent?: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  lastPage?: number;
  videoPositionSeconds?: number;
  readingProgress?: number;
}

export type ResourceStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const RESOURCE_STATUSES: { value: ResourceStatus; label: string; symbol: string; color: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", symbol: "○", color: "slate" },
  { value: "IN_PROGRESS", label: "In Progress", symbol: "◐", color: "ember" },
  { value: "COMPLETED", label: "Completed", symbol: "✓", color: "moss" },
];

export interface TagCount {
  tag: string;
  count: number;
}

export const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: "ARTICLE", label: "Article" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "VIDEO", label: "Video" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "COURSE", label: "Course" },
  { value: "BOOK", label: "Book" },
  { value: "PDF", label: "PDF" },
  { value: "GITHUB", label: "GitHub" },
  { value: "CUSTOM", label: "Custom" },
  { value: "DOC", label: "Doc" },
  { value: "REPO", label: "Repo" },
];

/* ── Notes ── */
export interface BacklinkResponse {
  noteId: number;
  title: string;
  linkText: string;
  roadmapId: number | null;
  topicId: number | null;
}

export interface NoteResponse {
  id: number;
  title: string;
  content: string | null;
  summary: string | null;
  tags: string[];
  wordCount: number;
  roadmapId: number | null;
  topicId: number | null;
  obsidianUri: string | null;
  obsidianFile: string | null;
  isStarred: boolean;
  isPinned: boolean;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  backlinks: BacklinkResponse[] | null;
  syncStatus: string | null;
  vaultPath: string | null;
  lastSyncedAt: string | null;
  hasConflict: boolean;
  conflictContent: string | null;
  conflictDetectedAt: string | null;
}

export interface NoteRequest {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  roadmapId?: number;
  topicId?: number;
  obsidianUri?: string;
  obsidianFile?: string;
  isStarred?: boolean;
  isPinned?: boolean;
}

/* ── Goals ── */
export interface GoalResponse {
  id: number;
  label: string;
  description: string | null;
  cadence: string;
  priority: string;
  status: string;
  targetValue: number;
  progressValue: number;
  unit: string | null;
  metricType: string;
  trackingType: string;
  complete: boolean;
  dueDate: string | null;
  topicId: number | null;
  roadmapId: number | null;
  streakCount: number;
  bestStreak: number;
  lastCheckedInDate: string | null;
  completedAt: string | null;
  prerequisiteGoalId: number | null;
  unlockThreshold: number | null;
  locked: boolean;
}

export interface GoalRequest {
  label: string;
  description?: string;
  cadence: string;
  priority?: string;
  status?: string;
  targetValue: number;
  progressValue: number;
  unit?: string;
  metricType?: string;
  trackingType?: string;
  dueDate?: string;
  topicId?: number;
  roadmapId?: number;
  prerequisiteGoalId?: number;
  unlockThreshold?: number;
}

export const CADENCES: { value: string; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "LONGTERM", label: "Long-term" },
];

export const METRIC_TYPES: { value: string; label: string }[] = [
  { value: "HOURS", label: "Study Hours" },
  { value: "TOPICS", label: "Topics Completed" },
  { value: "PROJECTS", label: "Projects" },
  { value: "CUSTOM", label: "Custom" },
];

export const TRACKING_TYPES: { value: string; label: string }[] = [
  { value: "MANUAL", label: "Manual check-in" },
  { value: "AUTOMATIC", label: "Auto-tracked" },
];

export interface RetroactiveLogRequest {
  goalId: number;
  durationMinutes: number;
  date?: string;
  notes?: string;
}

export interface GoalCheckInResponse {
  id: number;
  goalId: number;
  date: string;
  value: number;
  notes: string | null;
  createdAt: string;
}

export interface MilestoneResponse {
  id: number;
  goalId: number;
  title: string;
  targetPercentage: number;
  isCompleted: boolean;
  completedAt: string | null;
}

/* ── Certifications ── */
export interface CertificationResponse {
  id: number;
  title: string;
  issuer: string;
  issuedDate: string | null;
  expiresDate: string | null;
  verificationUrl: string | null;
  status: string;
  expiryStatus: string;
  completionDate: string | null;
  roadmapId: number | null;
  studyHours: number;
  notes: string | null;
}

export interface CertificationRequest {
  title: string;
  issuer: string;
  issuedDate?: string;
  expiresDate?: string;
  verificationUrl?: string;
  status: string;
  completionDate?: string;
  roadmapId?: number;
  studyHours?: number;
  notes?: string;
}

export const CERT_STATUSES: { value: string; label: string }[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

/* ── Projects ── */
export interface ProjectResponse {
  id: number;
  title: string;
  summary: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  completed: boolean;
  topicId: number | null;
  roadmapId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRequest {
  title: string;
  summary?: string;
  githubUrl?: string;
  demoUrl?: string;
  completed: boolean;
  topicId?: number;
  roadmapId?: number;
}

/* ── Study Sessions ── */
export interface StudySessionResponse {
  id: number;
  sessionDate: string;
  minutes: number;
  roadmapId: number | null;
  topicId: number | null;
  note: string | null;
}

export interface StudySessionRequest {
  sessionDate: string;
  minutes: number;
  roadmapId?: number;
  topicId?: number;
  note?: string;
}

/* ── Search ── */
export interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
}

/* ── Dashboard ── */
export interface DashboardResponse {
  activeRoadmaps: number;
  totalTopics: number;
  completedTopics: number;
  totalProjects: number;
  completedProjects: number;
  totalStudyHours: number;
  weekStudyHours: number;
  currentStreak: number;
  longestStreak: number;
  goalsOnTrack: number;
  totalGoals: number;
  plannedCerts: number;
  inProgressCerts: number;
  completedCerts: number;
  activityHeatmap: StudyDay[];
  weeklyHours: StudyDay[];
  roadmapProgress: RoadmapProgress[];
  recentActivity: RecentActivity[];
}

export interface StudyDay {
  date: string;
  hours: number;
  sessions: number;
}

export interface RoadmapProgress {
  id: number;
  title: string;
  progressPercent: number;
  topicCount: number;
  colorTheme: string;
}

export interface RecentActivity {
  type: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

/* ── Goal Checklist ── */
export interface GoalChecklistItemResponse {
  id: number;
  goalId: number;
  text: string;
  done: boolean;
  orderIndex: number;
}

export interface GoalChecklistItemRequest {
  text: string;
  done?: boolean;
  orderIndex?: number;
}

/* ── Topic Resource Group ── */
export interface TopicResourceGroup {
  topicId: number;
  topicTitle: string;
  resources: ResourceResponse[];
  completedCount: number;
  totalCount: number;
}

/* ── Timer Status ── */
export interface TimerStatusResponse {
  status: string;
  serverStartTime: string | null;
  accumulatedSeconds: number;
  serverNow: string;
}

export interface TimerStatusDTO {
  status: string;
  serverStartTime: string | null;
  accumulatedSeconds: number;
  topicId: number | null;
  topicTitle: string;
}

export interface TimerSessionResponse {
  id: number;
  topicId: number;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  isManual: boolean;
  createdAt: string;
  note?: string | null;
}

/* ── Obsidian ── */
export interface UserSettingsResponse {
  id: number | null;
  obsidianVaultName: string | null;
  dailyStudyHours: number;
  obsidianVaultPath: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  notesStoragePath: string | null;
}

export interface NotesStorageVerifyResponse {
  success: boolean;
  message: string;
}

export interface VerifyConnectionResponse {
  success: boolean;
  message: string;
  vaultPath: string | null;
  fileCount: number;
  markdownFileCount: number;
}

export interface SyncEvent {
  type: "NOTE_CREATED" | "NOTE_UPDATED" | "NOTE_DELETED" | "CONFLICT_DETECTED" | "SYNC_STATUS_CHANGED";
  noteId: number;
  title: string;
  syncStatus: string;
  hasConflict?: boolean;
}

export interface SyncStatusResponse {
  connected: boolean;
  vaultPath: string | null;
  vaultName: string | null;
  lastSyncAt: string | null;
  totalNotes: number;
  syncedNotes: number;
  pendingNotes: number;
  conflictedNotes: number;
}

/* ── Gamification ── */
export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  weeklyStreak: number;
  monthlyStreak: number;
  perfectWeeks: number;
  perfectMonths: number;
  lastActivityDate: string | null;
  atRisk: boolean;
  statusMessage: string;
}

export interface XpTransactionResponse {
  id: number;
  amount: number;
  reason: string;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

export interface XpResponse {
  totalXp: number;
  level: number;
  xpForNextLevel: number;
  progressPercent: number;
  recentTransactions: XpTransactionResponse[];
}

export interface AchievementResponse {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface GamificationDashboardResponse {
  streak: StreakResponse;
  xp: XpResponse;
  achievements: AchievementResponse[];
  unreadAchievements: number;
}

/* ── Graph ── */
export interface GraphDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
}

export interface GraphNodeDTO {
  id: number;
  title: string;
  status: string;
  estimatedMinutes: number;
  noteCount: number;
  resourceCount: number;
  index?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphEdgeDTO {
  source: number;
  target: number;
  type: string;
}

/* ── Schedule ── */
export interface StudyScheduleItem {
  id: number;
  topicId: number;
  topicTitle: string;
  scheduledDate: string;
  plannedMinutes: number;
  note: string | null;
}

export interface ScheduleStats {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
}

export interface AutoSchedulePreview {
  totalTopics: number;
  totalDays: number;
  items: StudyScheduleItem[];
}

/* ── Daily Plans (AI Planner) ── */
export interface DailyPlanResponse {
  id: number;
  userId: number;
  date: string;
  taskTitle: string;
  topicId: number | null;
  topicTitle: string | null;
  goalId: number | null;
  goalTitle: string | null;
  estimatedMinutes: number;
  sortOrder: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface AiPlanRequest {
  date: string;
  tasks: AiTaskSeed[];
  groqApiKey?: string;
}

export interface AiTaskSeed {
  title: string;
  topicTitle?: string;
  topicId?: number;
  goalId?: number;
  goalTitle?: string;
  difficulty?: string;
  estimatedMinutes?: number;
}

export interface AiPlanResponse {
  date: string;
  tasks: AiPlannedTask[];
}

/* ── AI Planner (RAG Pipeline) ── */
export interface PlanningContext {
  roadmapTitle: string;
  pendingTopics: PlanningTopicSeed[];
  userAvailability: { preferredStudyHoursPerDay: number; availableDays: string[] };
  learningPaceAvgMinutes: number;
}

export interface PlanningTopicSeed {
  id: number;
  title: string;
  difficulty: number;
  estimatedMinutes: number;
  prerequisiteTopicId: number | null;
  status: string;
}

export interface AiPlannedTask {
  topicId: number | null;
  taskType: "new_learning" | "deep_practice" | "spaced_review";
  approxDurationMinutes: number;
  reasoning: string;
  title?: string;
}

export interface AiDailyPlanBlock {
  dayLabel: string;
  totalLoadMinutes: number;
  tasks: AiPlannedTask[];
}

export type PlanDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/** Lightweight chunk streamed during monthly plan generation */
export interface MonthlyPlanChunk {
  day: number;
  title: string;
  estimatedMinutes: number;
  difficulty: PlanDifficulty;
}

/* ── Goal Projections (Time-to-Goal) ── */
export interface GoalProjection {
  goalId: number;
  goalTitle: string;
  targetValue: number;
  progressValue: number;
  remainingValue: number;
  unit: string;
  dueDate: string | null;
  avgDailyMinutes: number;
  estimatedDaysRemaining: number;
  projectedCompletionDate: string;
  onTrack: boolean;
  insight: string;
}

/** Committed AI task (after `/commit` persists into ScheduleSession) */
export interface AiCommittedTask {
  id: number;
  title: string;
  topicTitle: string | null;
  topicId: number | null;
  goalId: number | null;
  goalTitle: string | null;
  difficulty: string;
  estimatedMinutes: number;
  sortOrder: number;
}

export interface AiScheduleResponse {
  planOverview: string;
  dailyPlans: AiDailyPlanBlock[];
}

/* ── Monthly Plans (AI Multi-Roadmap) ── */
export interface MonthlyPlanResponse {
  id: number;
  userId: number;
  monthKey: string;
  date: string;
  taskTitle: string;
  topicId: number | null;
  topicTitle: string | null;
  roadmapId: number | null;
  roadmapTitle: string | null;
  roadmapColor: string | null;
  estimatedMinutes: number;
  sortOrder: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  difficulty: PlanDifficulty;
}

/* ── Templates ── */
export interface TemplateSummary {
  key: string;
  title: string;
  description: string;
  tag: string;
  colorTheme: string;
  topicCount: number;
  source?: string;
}

export interface TemplatePreview {
  key: string;
  title: string;
  description: string;
  category: string;
  colorTheme: string;
  topics: TemplatePreviewTopic[];
  edgeCount: number;
}

export interface TemplatePreviewTopic {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  estHours: number;
  children?: TemplatePreviewTopic[];
  resourceCount?: number;
  childCount?: number;
}

/* ── Progress Engine ── */
export interface ResourceProgressResponse {
  id: number;
  title: string;
  type: string;
  url: string | null;
  status: string;
  progressPercent: number;
  bookmarked: boolean;
  favorite: boolean;
  videoPositionSeconds: number | null;
  lastPage: number | null;
  roadmapId: number | null;
  topicId: number | null;
  updatedAt: string;
  completedAt: string | null;
}

export interface TopicProgressResponse {
  topicId: number;
  topicTitle: string;
  roadmapId: number;
  roadmapTitle: string;
  status: string;
  progressPercent: number;
  totalResources: number;
  completedResources: number;
}

export interface RoadmapProgressResponse {
  roadmapId: number;
  roadmapTitle: string;
  colorTheme: string;
  progressPercent: number;
  topicCount: number;
  totalResources: number;
  completedResources: number;
  topics: TopicProgressResponse[];
}

export interface WorkspaceResponse {
  dashboardProgress: number;
  totalResources: number;
  completedResources: number;
  inProgressCount: number;
  continueLearning: ResourceProgressResponse[];
  completedToday: ResourceProgressResponse[];
  completedThisWeek: ResourceProgressResponse[];
  bookmarked: ResourceProgressResponse[];
  roadmapProgress: RoadmapProgressResponse[];
  topicProgress: TopicProgressResponse[];
}

/* ── Recent Activity ── */
export interface RecentActivityResponse {
  id: number;
  activityType: string;
  entityType: string | null;
  entityId: number | null;
  title: string;
  subtitle: string | null;
  createdAt: string;
}

/* ── Schedule Sessions (Advanced) ── */
export type ScheduleSessionStatus = "PLANNED" | "COMPLETED" | "SKIPPED" | "NO_SHOW";

export interface ScheduleSessionResponse {
  id: number;
  userId: number;
  title: string;
  topicId: number | null;
  topicTitle: string | null;
  resourceId: number | null;
  resourceTitle: string | null;
  status: ScheduleSessionStatus;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDuration: number | null;
  timezone: string;
  recurrenceRule: string | null;
  originalSeriesId: number | null;
  pomodoroCount: number;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

export interface SessionRequest {
  title: string;
  topicId?: number;
  resourceId?: number;
  plannedStartTime: string;
  plannedEndTime: string;
  timezone: string;
  recurrenceRule?: string;
  notes?: string;
}

export interface SessionUpdateRequest {
  title?: string;
  topicId?: number;
  resourceId?: number;
  status?: ScheduleSessionStatus;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number;
  timezone?: string;
  recurrenceRule?: string;
  pomodoroCount?: number;
  rating?: number;
  notes?: string;
}

/* ── Cognitive Analysis (Phase 3.1) ── */
export interface CognitiveAnalysisResponse {
  strengths: string[];
  bottlenecks: string[];
  optimalStrategy: string;
  predictedBurnoutRisk: "low" | "medium" | "high";
  studyStats: {
    avgSessionMinutes: number;
    totalSessions: number;
    totalFocusMinutes: number;
    longestStreakDays: number;
    currentStreakDays: number;
  };
}
