/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum QueryCategory {
  Account = "Account",
  Card = "Card",
  Loan = "Loan",
  Fraud = "Fraud",
  Other = "Other"
}

export enum SessionStatus {
  Waiting = "waiting",
  Active = "active",
  Callback = "callback",
  OfflineLeft = "offline_left",
  Completed = "completed",
  Abandoned = "abandoned"
}

export enum AgentStatus {
  Online = "Online",
  Busy = "Busy",
  Away = "Away",
  Offline = "Offline"
}

export interface ChatAttachment {
  name: string;
  size: number;
  url: string;
  isMalwareSafe: boolean;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  senderType: "client" | "agent" | "system";
  senderName: string;
  text: string;
  timestamp: number;
  fileAttachment?: ChatAttachment | null;
}

export interface ClientSession {
  sessionId: string;
  fullName: string;
  phoneNumber: string; // Stored parsed/plain on active state, hashed upon final audit logs or masked view
  queryCategory: QueryCategory;
  rawQuery: string;
  status: SessionStatus;
  joinedQueueAt: number;
  assignedAgentId: string | null;
  chatStartedAt: number | null;
  chatEndedAt: number | null;
  rating: number | null; // 0-10 scale
  feedbackText: string | null;
  isVip: boolean;
  callbackAssignedAt?: number | null;
}

export interface Agent {
  agentId: string;
  name: string;
  status: AgentStatus;
  chatsHandledCount: number;
  totalRatingPoints: number;
  ratingsCount: number;
  averageRating: number;
  adherenceSeconds: number; // For scorecard SLA
  chatsPerHour: number;
}

export interface CallCenterState {
  sessions: ClientSession[];
  agents: Agent[];
  messages: ChatMessage[];
}
