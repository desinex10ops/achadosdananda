export type TriggerType =
  | "COMMENT_ANY"
  | "COMMENT_POST"
  | "COMMENT_REEL"
  | "STORY_REPLY"
  | "DIRECT_MESSAGE";

export type MatchType = "EXACT" | "CONTAINS" | "STARTS_WITH" | "REGEX" | "ANY";

export type ActionType =
  | "SEND_DM"
  | "REPLY_COMMENT"
  | "LIKE_COMMENT"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "WEBHOOK_POST";

export interface InstagramNormalizedEvent {
  accountId: string;
  source: "webhook" | "simulation" | "manual";
  eventType: "COMMENT" | "MESSAGE" | "STORY_REPLY";
  mediaId?: string;
  mediaUrl?: string;
  commentId?: string;
  senderId: string; // IGSID (Instagram Scoped ID)
  senderUsername?: string;
  text: string;
  timestamp: Date;
  rawPayload?: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  isMatch: boolean;
  matchedKeyword?: string;
  matchedAutomationId?: string;
  rejectionReason?: string;
}

export interface SendDMParams {
  recipientId: string;
  text: string;
  button?: {
    title: string;
    url: string;
  };
}

export interface ReplyCommentParams {
  commentId: string;
  text: string;
}

export interface IInstagramProvider {
  sendDirectMessage(params: SendDMParams): Promise<{ success: boolean; messageId?: string; error?: string }>;
  replyComment(params: ReplyCommentParams): Promise<{ success: boolean; commentId?: string; error?: string }>;
  likeComment(commentId: string): Promise<{ success: boolean; error?: string }>;
  getUserProfile(userId: string): Promise<{ id: string; username?: string; name?: string } | null>;
}

export interface TemplateVariables {
  username?: string;
  name?: string;
  link?: string;
  productName?: string;
  price?: string;
  coupon?: string;
  [key: string]: string | undefined;
}

export interface SimulationResult {
  success: boolean;
  steps: Array<{
    step: string;
    status: "SUCCESS" | "WARNING" | "FAILED" | "SKIPPED";
    details: string;
    data?: Record<string, unknown>;
  }>;
  preview: {
    publicReply?: string;
    dmMessage?: string;
    button?: { text: string; url: string };
    tagsAssigned?: string[];
  };
  error?: string;
}
