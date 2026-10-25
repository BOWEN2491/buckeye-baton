import type { User } from './types';

// P4 contract (docs/P4_CONTRACT.md). Public dates are ISO UTC; ordering and cycle precision stay internal.
export type InboxFilter = 'all' | 'unread' | 'invitations';
export type ActivityEvent = 'question_created' | 'post_created' | 'referral_created';
export type RecipientReason = 'project_owner' | 'question_author' | 'assigned_mentor' | 'referring_staff';
export type InvitationKind = 'pickup' | 'help';
export type InvitationStatus = 'pending' | 'accepted' | 'ignored' | 'expired' | 'cancelled';
export interface InboxBase {
  id: string; createdAt: string; readAt: string | null;
  projectId: string; projectTitle: string; questionId: string | null;
  href: string; // server-built internal /projects/... path and valid anchor only
}
export interface ActivityItem extends InboxBase {
  kind: 'activity'; event: ActivityEvent; actor: User;
  reasons: RecipientReason[]; postKind: 'comment' | 'follow_up' | 'mentor_reply' | null;
  questionTitle: string | null; preview: string | null; removed: boolean;
}
export interface MatchEvidence { projectId: string; projectTitle: string; kind: 'shared_experience' | 'mentor_reply' }
export interface InvitationItem extends InboxBase {
  kind: 'invitation'; invitationKind: InvitationKind; status: InvitationStatus;
  expiresAt: string; respondedAt: string | null; actionable: boolean;
  matchedTags: string[]; evidence: MatchEvidence[]; reason: string;
}
export type InboxItem = ActivityItem | InvitationItem;
export interface InboxPage { items: InboxItem[]; nextCursor: string | null; unreadCount: number; asOf: string }
export interface InboxPreferences { automaticInvitations: boolean }
export interface InterestedHelper { invitationId: string; user: User; acceptedAt: string; matchedTags: string[]; evidence: MatchEvidence[] }
export interface InvitationRunnerStatus {
  enabled: boolean; intervalSeconds: 60; lastCompletedAt: string | null;
  lastFailureAt: string | null; error: 'DISPATCH_FAILED' | null;
}
