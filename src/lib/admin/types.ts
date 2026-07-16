export type AdminTone = "neutral" | "info" | "success" | "warning" | "danger";

export type AdminDataSensitivity =
  | "aggregate"
  | "technical"
  | "public_content"
  | "account_state"
  | "synthetic"
  | "audit_metadata";

export type AdminActionMode = "disabled" | "simulation";

export type AdminModuleId =
  | "overview"
  | "users"
  | "subscriptions"
  | "recipes"
  | "sport"
  | "community"
  | "ai"
  | "operations"
  | "audit";

export interface AdminFixtureNotice {
  title: string;
  description: string;
  generatedAt: string;
}

export interface AdminMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AdminTone;
  sensitivity: AdminDataSensitivity;
}

export interface AdminAction {
  id: string;
  label: string;
  mode: AdminActionMode;
  reason: string;
}

export interface AdminTableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export type AdminTableRow = Record<string, string | number>;

export interface AdminTable {
  columns: AdminTableColumn[];
  rows: AdminTableRow[];
}

export interface AdminStatusItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AdminTone;
  sensitivity: AdminDataSensitivity;
}

export interface AdminModuleUsage {
  id: string;
  module: string;
  activeUsers: string;
  weeklyChange: string;
  adoption: number;
  tone: AdminTone;
}

export interface AdminUserFixture {
  id: string;
  displayName: string;
  contact: string;
  accountState: string;
  onboarding: string;
  subscription: string;
  lastActivity: string;
  syncState: string;
  tone: AdminTone;
}

export interface AdminSubscriptionFixture {
  id: string;
  account: string;
  offer: string;
  source: string;
  renewal: string;
  appRights: string;
  reconciliation: string;
  tone: AdminTone;
}

export interface AdminContentFixture {
  id: string;
  title: string;
  owner: string;
  status: string;
  category: string;
  updatedAt: string;
  reviewState: string;
  tone: AdminTone;
}

export interface AdminCommunityFixture {
  id: string;
  reportType: string;
  target: string;
  priority: string;
  queueAge: string;
  decisionState: string;
  tone: AdminTone;
}

export interface AdminAiFixture {
  id: string;
  capability: string;
  version: string;
  rollout: string;
  lastSyntheticRun: string;
  guardrailState: string;
  tone: AdminTone;
}

export interface AdminOperationFixture {
  id: string;
  service: string;
  state: string;
  lastCheck: string;
  queue: string;
  detail: string;
  tone: AdminTone;
}

export interface AdminAuditFixture {
  id: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  createdAt: string;
  metadata: string;
  tone: AdminTone;
}
