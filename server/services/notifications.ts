import { storage } from "../storage";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | "lead_scored"
  | "lead_stale"
  | "opportunity_stage"
  | "campaign_completed"
  | "agent_completed"
  | "email_opened"
  | "email_replied"
  | "meeting_reminder"
  | "automation_triggered"
  | "system";

const userNotifications: Map<string, Notification[]> = new Map();
const MAX_NOTIFICATIONS = 100;

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any
): Notification {
  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    message,
    data,
    isRead: false,
    createdAt: new Date(),
  };

  const notifications = userNotifications.get(userId) || [];
  notifications.unshift(notification);
  
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.pop();
  }
  
  userNotifications.set(userId, notifications);
  
  console.log(`[Notification] Created ${type} for user ${userId}: ${title}`);
  return notification;
}

export function getNotifications(userId: string, limit = 50): Notification[] {
  const notifications = userNotifications.get(userId) || [];
  return notifications.slice(0, limit);
}

export function getUnreadCount(userId: string): number {
  const notifications = userNotifications.get(userId) || [];
  return notifications.filter(n => !n.isRead).length;
}

export function markAsRead(userId: string, notificationId: string): boolean {
  const notifications = userNotifications.get(userId) || [];
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.isRead = true;
    return true;
  }
  return false;
}

export function markAllAsRead(userId: string): number {
  const notifications = userNotifications.get(userId) || [];
  let count = 0;
  for (const notification of notifications) {
    if (!notification.isRead) {
      notification.isRead = true;
      count++;
    }
  }
  return count;
}

export function deleteNotification(userId: string, notificationId: string): boolean {
  const notifications = userNotifications.get(userId) || [];
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications.splice(index, 1);
    userNotifications.set(userId, notifications);
    return true;
  }
  return false;
}

export function clearAllNotifications(userId: string): void {
  userNotifications.set(userId, []);
}

export async function notifyLeadScored(userId: string, leadName: string, score: number): Promise<void> {
  const scoreLabel = score >= 80 ? "Hot" : score >= 60 ? "Warm" : score >= 40 ? "Cool" : "Cold";
  createNotification(
    userId,
    "lead_scored",
    "Lead Scored",
    `${leadName} scored ${score}/100 (${scoreLabel})`,
    { leadName, score, scoreLabel }
  );
}

export async function notifyStaleLeads(userId: string, count: number): Promise<void> {
  if (count > 0) {
    createNotification(
      userId,
      "lead_stale",
      "Stale Leads Detected",
      `${count} lead${count > 1 ? 's have' : ' has'} not been contacted in 14+ days`,
      { count }
    );
  }
}

export async function notifyOpportunityStageChange(
  userId: string, 
  opportunityTitle: string, 
  oldStage: string, 
  newStage: string
): Promise<void> {
  createNotification(
    userId,
    "opportunity_stage",
    "Opportunity Updated",
    `${opportunityTitle} moved from ${oldStage} to ${newStage}`,
    { opportunityTitle, oldStage, newStage }
  );
}

export async function notifyCampaignCompleted(
  userId: string, 
  campaignName: string, 
  stats: { sent: number; opened: number; clicked: number }
): Promise<void> {
  createNotification(
    userId,
    "campaign_completed",
    "Campaign Completed",
    `${campaignName}: ${stats.sent} sent, ${stats.opened} opened, ${stats.clicked} clicked`,
    { campaignName, ...stats }
  );
}

export async function notifyAgentCompleted(userId: string, agentName: string, summary: string): Promise<void> {
  createNotification(
    userId,
    "agent_completed",
    "AI Agent Completed",
    `${agentName}: ${summary}`,
    { agentName, summary }
  );
}

export async function notifyEmailEngagement(
  userId: string, 
  type: "opened" | "replied", 
  leadName: string, 
  subject: string
): Promise<void> {
  createNotification(
    userId,
    type === "opened" ? "email_opened" : "email_replied",
    type === "opened" ? "Email Opened" : "Email Reply Received",
    `${leadName} ${type} your email: "${subject}"`,
    { leadName, subject, type }
  );
}

export async function notifyMeetingReminder(
  userId: string, 
  meetingTitle: string, 
  scheduledAt: Date
): Promise<void> {
  const timeUntil = Math.round((scheduledAt.getTime() - Date.now()) / (1000 * 60));
  createNotification(
    userId,
    "meeting_reminder",
    "Meeting Reminder",
    `${meetingTitle} starts in ${timeUntil} minutes`,
    { meetingTitle, scheduledAt, timeUntil }
  );
}

export async function notifyAutomationTriggered(
  userId: string, 
  ruleName: string, 
  actionsTaken: number
): Promise<void> {
  createNotification(
    userId,
    "automation_triggered",
    "Automation Executed",
    `${ruleName} ran and completed ${actionsTaken} action${actionsTaken > 1 ? 's' : ''}`,
    { ruleName, actionsTaken }
  );
}

export async function notifySystem(userId: string, title: string, message: string): Promise<void> {
  createNotification(userId, "system", title, message);
}
