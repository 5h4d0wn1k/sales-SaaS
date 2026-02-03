import { storage } from "../storage";
import { executeAutonomousAgent, type AgentContext } from "./autonomous-agents";

interface ScheduledJob {
  id: string;
  name: string;
  interval: number;
  lastRun: Date | null;
  isRunning: boolean;
  handler: () => Promise<void>;
}

class JobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isStarted = false;

  registerJob(id: string, name: string, intervalMs: number, handler: () => Promise<void>) {
    this.jobs.set(id, {
      id,
      name,
      interval: intervalMs,
      lastRun: null,
      isRunning: false,
      handler,
    });
  }

  start() {
    if (this.isStarted) return;
    this.isStarted = true;
    console.log("[Scheduler] Starting job scheduler...");

    Array.from(this.jobs.entries()).forEach(([id, job]) => {
      this.scheduleJob(id, job);
    });
  }

  private scheduleJob(id: string, job: ScheduledJob) {
    const runJob = async () => {
      if (job.isRunning) {
        console.log(`[Scheduler] Job ${job.name} already running, skipping...`);
        return;
      }

      job.isRunning = true;
      job.lastRun = new Date();
      console.log(`[Scheduler] Running job: ${job.name}`);

      try {
        await job.handler();
        console.log(`[Scheduler] Job ${job.name} completed successfully`);
      } catch (error) {
        console.error(`[Scheduler] Job ${job.name} failed:`, error);
      } finally {
        job.isRunning = false;
      }
    };

    runJob();
    const timer = setInterval(runJob, job.interval);
    this.timers.set(id, timer);
  }

  stop() {
    Array.from(this.timers.values()).forEach(timer => {
      clearInterval(timer);
    });
    this.timers.clear();
    this.isStarted = false;
    console.log("[Scheduler] Job scheduler stopped");
  }

  getStatus() {
    const status: Record<string, any> = {};
    Array.from(this.jobs.entries()).forEach(([id, job]) => {
      status[id] = {
        name: job.name,
        interval: job.interval,
        lastRun: job.lastRun,
        isRunning: job.isRunning,
      };
    });
    return status;
  }
}

export const scheduler = new JobScheduler();

async function runActiveAgentTasks() {
  try {
    const allUsers = await getAllUsersWithActiveAgents();
    
    for (const userId of allUsers) {
      const tasks = await storage.getAgenticTasks(userId);
      const activeTasks = tasks.filter(t => t.isActive && t.status !== "running");

      for (const task of activeTasks.slice(0, 3)) {
        try {
          const [businessProfile, leads, opportunities, clients] = await Promise.all([
            storage.getBusinessProfile(userId),
            storage.getLeads(userId),
            storage.getOpportunities(userId),
            storage.getClients(userId),
          ]);

          const context: AgentContext = {
            businessProfile: businessProfile || undefined,
            leads,
            opportunities,
            clients,
          };

          await storage.updateAgenticTaskResult(task.id, userId, null, 10);
          const result = await executeAutonomousAgent(task, context);
          await storage.updateAgenticTaskResult(task.id, userId, result, 100);
        } catch (error) {
          console.error(`[Agent] Task ${task.id} failed:`, error);
          await storage.updateAgenticTaskResult(task.id, userId, { error: "Execution failed" }, 0);
        }
      }
    }
  } catch (error) {
    console.error("[Agent] Batch agent run failed:", error);
  }
}

async function processScheduledOutreach() {
  try {
    const allUsers = await getAllUsersWithScheduledOutreach();
    
    for (const userId of allUsers) {
      const pendingOutreach = await storage.getPendingOutreach(userId);
      
      for (const outreach of pendingOutreach) {
        try {
          const result = { 
            status: "executed",
            executedAt: new Date().toISOString(),
            channel: outreach.channel,
          };
          await storage.executeScheduledOutreach(outreach.id, userId, result);
          console.log(`[Outreach] Executed outreach ${outreach.id} for user ${userId}`);
        } catch (error) {
          console.error(`[Outreach] Failed to execute outreach ${outreach.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[Outreach] Batch outreach processing failed:", error);
  }
}

async function processAutomationRules() {
  try {
    const allUsers = await getAllUsersWithAutomationRules();
    
    for (const userId of allUsers) {
      const rules = await storage.getAutomationRules(userId);
      const activeRules = rules.filter(r => r.isActive);
      
      for (const rule of activeRules) {
        try {
          const shouldExecute = await evaluateRuleConditions(userId, rule);
          if (shouldExecute) {
            await executeRuleActions(userId, rule);
            await storage.executeAutomationRule(rule.id, userId);
            console.log(`[Automation] Executed rule ${rule.id} for user ${userId}`);
          }
        } catch (error) {
          console.error(`[Automation] Rule ${rule.id} failed:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[Automation] Batch automation processing failed:", error);
  }
}

async function updateLeadScores() {
  try {
    const allUsers = await getAllUsersWithLeads();
    
    for (const userId of allUsers) {
      const leads = await storage.getLeads(userId);
      const businessProfile = await storage.getBusinessProfile(userId);
      
      for (const lead of leads.slice(0, 20)) {
        try {
          const activities = await storage.getLeadActivities(userId, lead.id);
          const now = new Date();
          const lastActivity = activities[0]?.createdAt;
          const daysSinceActivity = lastActivity 
            ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
            : 30;
          
          let baseScore = lead.score || 50;
          if (daysSinceActivity > 14) baseScore -= 10;
          if (daysSinceActivity > 30) baseScore -= 20;
          if (activities.length > 5) baseScore += 10;
          if (lead.status === "qualified") baseScore += 15;
          
          const newScore = Math.max(0, Math.min(100, baseScore));
          if (newScore !== lead.score) {
            await storage.updateLeadScore(lead.id, userId, newScore);
          }
        } catch (error) {
          console.error(`[Scoring] Failed to update score for lead ${lead.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("[Scoring] Batch lead scoring failed:", error);
  }
}

async function getAllUsersWithActiveAgents(): Promise<string[]> {
  const { db } = await import("../db");
  const { agenticTasks } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  
  const tasks = await db.select({ userId: agenticTasks.userId })
    .from(agenticTasks)
    .where(eq(agenticTasks.isActive, true));
  
  return Array.from(new Set(tasks.map(t => t.userId)));
}

async function getAllUsersWithScheduledOutreach(): Promise<string[]> {
  const { db } = await import("../db");
  const { scheduledOutreach } = await import("@shared/schema");
  const { eq, lte, and } = await import("drizzle-orm");
  
  const outreach = await db.select({ userId: scheduledOutreach.userId })
    .from(scheduledOutreach)
    .where(and(
      eq(scheduledOutreach.status, "scheduled"),
      lte(scheduledOutreach.scheduledAt, new Date())
    ));
  
  return Array.from(new Set(outreach.map(o => o.userId)));
}

async function getAllUsersWithAutomationRules(): Promise<string[]> {
  const { db } = await import("../db");
  const { automationRules } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  
  const rules = await db.select({ userId: automationRules.userId })
    .from(automationRules)
    .where(eq(automationRules.isActive, true));
  
  return Array.from(new Set(rules.map(r => r.userId)));
}

async function getAllUsersWithLeads(): Promise<string[]> {
  const { db } = await import("../db");
  const { leads } = await import("@shared/schema");
  
  const leadsList = await db.selectDistinct({ userId: leads.userId }).from(leads);
  return leadsList.map(l => l.userId);
}

async function evaluateRuleConditions(userId: string, rule: any): Promise<boolean> {
  const conditions = rule.conditions as any;
  if (!conditions) return true;
  
  const trigger = rule.trigger;
  const now = new Date();
  
  switch (trigger) {
    case "lead_created":
      const leads = await storage.getLeads(userId);
      const recentLeads = leads.filter(l => {
        const created = new Date(l.createdAt!);
        return (now.getTime() - created.getTime()) < 5 * 60 * 1000;
      });
      return recentLeads.length > 0;
    
    case "lead_stale":
      const staleLeads = await storage.getLeads(userId);
      return staleLeads.some(l => {
        if (!l.lastContactedAt) return true;
        const lastContact = new Date(l.lastContactedAt);
        return (now.getTime() - lastContact.getTime()) > 14 * 24 * 60 * 60 * 1000;
      });
    
    case "opportunity_stage_change":
      return false;
    
    case "scheduled":
      const lastExecuted = rule.lastExecutedAt;
      if (!lastExecuted) return true;
      const hoursSinceExecution = (now.getTime() - new Date(lastExecuted).getTime()) / (1000 * 60 * 60);
      return hoursSinceExecution >= (conditions.intervalHours || 24);
    
    default:
      return false;
  }
}

async function executeRuleActions(userId: string, rule: any): Promise<void> {
  const actions = rule.actions as any[];
  if (!actions || actions.length === 0) return;
  
  for (const action of actions) {
    switch (action.type) {
      case "send_email":
        console.log(`[Automation] Would send email: ${action.subject}`);
        break;
      
      case "create_task":
        console.log(`[Automation] Would create task: ${action.name}`);
        break;
      
      case "update_lead_status":
        const leads = await storage.getLeads(userId);
        if (action.leadId) {
          await storage.updateLead(action.leadId, userId, { status: action.status });
        }
        break;
      
      case "notify":
        console.log(`[Automation] Notification: ${action.message}`);
        break;
    }
  }
}

export function initializeScheduler() {
  scheduler.registerJob(
    "agent-tasks",
    "Run Active AI Agent Tasks",
    5 * 60 * 1000,
    runActiveAgentTasks
  );

  scheduler.registerJob(
    "scheduled-outreach",
    "Process Scheduled Outreach",
    60 * 1000,
    processScheduledOutreach
  );

  scheduler.registerJob(
    "automation-rules",
    "Process Automation Rules",
    2 * 60 * 1000,
    processAutomationRules
  );

  scheduler.registerJob(
    "lead-scoring",
    "Update Lead Scores",
    15 * 60 * 1000,
    updateLeadScores
  );

  scheduler.start();
}
