import { db } from "./db";
import {
  leads, opportunities, clients, campaigns, emailTemplates, customerSuccess,
  subscriptions, agenticTasks, analytics, leadActivities, businessProfiles,
  emailSequences, sequenceEnrollments, aiGeneratedContent,
  type InsertLead, type InsertOpportunity, type InsertClient, type InsertCampaign,
  type InsertEmailTemplate, type InsertCustomerSuccessTask, type InsertAgenticTask,
  type Lead, type Opportunity, type Client, type Campaign, type EmailTemplate,
  type CustomerSuccessTask, type Subscription, type AgenticTask, type LeadActivity,
  type InsertLeadActivity, type BusinessProfile, type InsertBusinessProfile,
  type EmailSequence, type InsertEmailSequence, type SequenceEnrollment,
  type InsertSequenceEnrollment, type AiGeneratedContent, type InsertAiGeneratedContent
} from "@shared/schema";
import { eq, desc, and, lt, sql } from "drizzle-orm";

export interface IStorage {
  getLeads(userId: string): Promise<Lead[]>;
  createLead(userId: string, lead: InsertLead): Promise<Lead>;
  updateLead(id: number, userId: string, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number, userId: string): Promise<void>;

  getOpportunities(userId: string): Promise<Opportunity[]>;
  createOpportunity(userId: string, opp: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: number, userId: string, updates: Partial<InsertOpportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: number, userId: string): Promise<void>;

  getClients(userId: string): Promise<Client[]>;
  createClient(userId: string, client: InsertClient): Promise<Client>;
  updateClient(id: number, userId: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number, userId: string): Promise<void>;

  getCampaigns(userId: string): Promise<Campaign[]>;
  createCampaign(userId: string, campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number, userId: string): Promise<void>;

  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(userId: string, template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, userId: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId: string): Promise<void>;

  getCustomerSuccessTasks(userId: string): Promise<CustomerSuccessTask[]>;
  createCustomerSuccessTask(userId: string, task: InsertCustomerSuccessTask): Promise<CustomerSuccessTask>;
  updateCustomerSuccessTask(id: number, userId: string, updates: Partial<InsertCustomerSuccessTask>): Promise<CustomerSuccessTask | undefined>;
  deleteCustomerSuccessTask(id: number, userId: string): Promise<void>;

  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, tier?: string): Promise<Subscription>;

  getAgenticTasks(userId: string): Promise<AgenticTask[]>;
  createAgenticTask(userId: string, task: InsertAgenticTask): Promise<AgenticTask>;
  updateAgenticTask(id: number, userId: string, updates: Partial<InsertAgenticTask>): Promise<AgenticTask | undefined>;
  toggleAgenticTask(id: number, userId: string): Promise<AgenticTask | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getLeads(userId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async createLead(userId: string, lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values({ ...lead, userId }).returning();
    return newLead;
  }

  async updateLead(id: number, userId: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set(updates).where(and(eq(leads.id, id), eq(leads.userId, userId))).returning();
    return updated;
  }

  async deleteLead(id: number, userId: string): Promise<void> {
    await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
  }

  async getOpportunities(userId: string): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(eq(opportunities.userId, userId)).orderBy(desc(opportunities.createdAt));
  }

  async createOpportunity(userId: string, opp: InsertOpportunity): Promise<Opportunity> {
    const [newOpp] = await db.insert(opportunities).values({ ...opp, userId }).returning();
    return newOpp;
  }

  async updateOpportunity(id: number, userId: string, updates: Partial<InsertOpportunity>): Promise<Opportunity | undefined> {
    const [updated] = await db.update(opportunities).set(updates).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId))).returning();
    return updated;
  }

  async deleteOpportunity(id: number, userId: string): Promise<void> {
    await db.delete(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)));
  }

  async getClients(userId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt));
  }

  async createClient(userId: string, client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values({ ...client, userId }).returning();
    return newClient;
  }

  async updateClient(id: number, userId: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(updates).where(and(eq(clients.id, id), eq(clients.userId, userId))).returning();
    return updated;
  }

  async deleteClient(id: number, userId: string): Promise<void> {
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
  }

  async getCampaigns(userId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(userId: string, campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values({ ...campaign, userId }).returning();
    return newCampaign;
  }

  async updateCampaign(id: number, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns).set(updates).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).returning();
    return updated;
  }

  async deleteCampaign(id: number, userId: string): Promise<void> {
    await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
  }

  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId)).orderBy(desc(emailTemplates.createdAt));
  }

  async createEmailTemplate(userId: string, template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values({ ...template, userId }).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, userId: string, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates).set(updates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId))).returning();
    return updated;
  }

  async deleteEmailTemplate(id: number, userId: string): Promise<void> {
    await db.delete(emailTemplates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }

  async getCustomerSuccessTasks(userId: string): Promise<CustomerSuccessTask[]> {
    return await db.select().from(customerSuccess).where(eq(customerSuccess.userId, userId)).orderBy(desc(customerSuccess.createdAt));
  }

  async createCustomerSuccessTask(userId: string, task: InsertCustomerSuccessTask): Promise<CustomerSuccessTask> {
    const [newTask] = await db.insert(customerSuccess).values({ ...task, userId }).returning();
    return newTask;
  }

  async updateCustomerSuccessTask(id: number, userId: string, updates: Partial<InsertCustomerSuccessTask>): Promise<CustomerSuccessTask | undefined> {
    const [updated] = await db.update(customerSuccess).set(updates).where(and(eq(customerSuccess.id, id), eq(customerSuccess.userId, userId))).returning();
    return updated;
  }

  async deleteCustomerSuccessTask(id: number, userId: string): Promise<void> {
    await db.delete(customerSuccess).where(and(eq(customerSuccess.id, id), eq(customerSuccess.userId, userId)));
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async createSubscription(userId: string, tier: string = "free"): Promise<Subscription> {
    const [sub] = await db.insert(subscriptions).values({ userId, tier }).returning();
    return sub;
  }

  async getAgenticTasks(userId: string): Promise<AgenticTask[]> {
    return await db.select().from(agenticTasks).where(eq(agenticTasks.userId, userId)).orderBy(desc(agenticTasks.createdAt));
  }

  async createAgenticTask(userId: string, task: InsertAgenticTask): Promise<AgenticTask> {
    const [newTask] = await db.insert(agenticTasks).values({ ...task, userId }).returning();
    return newTask;
  }

  async updateAgenticTask(id: number, userId: string, updates: Partial<InsertAgenticTask>): Promise<AgenticTask | undefined> {
    const [updated] = await db.update(agenticTasks).set(updates).where(and(eq(agenticTasks.id, id), eq(agenticTasks.userId, userId))).returning();
    return updated;
  }

  async toggleAgenticTask(id: number, userId: string): Promise<AgenticTask | undefined> {
    const [task] = await db.select().from(agenticTasks).where(and(eq(agenticTasks.id, id), eq(agenticTasks.userId, userId)));
    if (!task) return undefined;
    const [updated] = await db.update(agenticTasks).set({ isActive: !task.isActive, lastRunAt: new Date() }).where(eq(agenticTasks.id, id)).returning();
    return updated;
  }

  async updateAgenticTaskResult(id: number, userId: string, result: any, progress: number): Promise<AgenticTask | undefined> {
    const [updated] = await db.update(agenticTasks)
      .set({ result, progress, lastRunAt: new Date(), status: progress >= 100 ? "completed" : "running" })
      .where(and(eq(agenticTasks.id, id), eq(agenticTasks.userId, userId)))
      .returning();
    return updated;
  }

  async getLeadActivities(userId: string, leadId: number): Promise<LeadActivity[]> {
    return await db.select().from(leadActivities)
      .where(and(eq(leadActivities.userId, userId), eq(leadActivities.leadId, leadId)))
      .orderBy(desc(leadActivities.createdAt));
  }

  async createLeadActivity(userId: string, activity: InsertLeadActivity): Promise<LeadActivity> {
    const [newActivity] = await db.insert(leadActivities).values({ ...activity, userId }).returning();
    await db.update(leads).set({ lastContactedAt: new Date() }).where(eq(leads.id, activity.leadId));
    return newActivity;
  }

  async getBusinessProfile(userId: string): Promise<BusinessProfile | undefined> {
    const [profile] = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId));
    return profile;
  }

  async createBusinessProfile(userId: string, profile: InsertBusinessProfile): Promise<BusinessProfile> {
    const [newProfile] = await db.insert(businessProfiles).values({ ...profile, userId, isOnboarded: true }).returning();
    return newProfile;
  }

  async updateBusinessProfile(userId: string, updates: Partial<InsertBusinessProfile>): Promise<BusinessProfile | undefined> {
    const [updated] = await db.update(businessProfiles).set(updates).where(eq(businessProfiles.userId, userId)).returning();
    return updated;
  }

  async getEmailSequences(userId: string): Promise<EmailSequence[]> {
    return await db.select().from(emailSequences).where(eq(emailSequences.userId, userId)).orderBy(desc(emailSequences.createdAt));
  }

  async createEmailSequence(userId: string, sequence: InsertEmailSequence): Promise<EmailSequence> {
    const [newSequence] = await db.insert(emailSequences).values({ ...sequence, userId }).returning();
    return newSequence;
  }

  async updateEmailSequence(id: number, userId: string, updates: Partial<InsertEmailSequence>): Promise<EmailSequence | undefined> {
    const [updated] = await db.update(emailSequences).set(updates).where(and(eq(emailSequences.id, id), eq(emailSequences.userId, userId))).returning();
    return updated;
  }

  async deleteEmailSequence(id: number, userId: string): Promise<void> {
    await db.delete(emailSequences).where(and(eq(emailSequences.id, id), eq(emailSequences.userId, userId)));
  }

  async getSequenceEnrollments(userId: string, sequenceId?: number): Promise<SequenceEnrollment[]> {
    if (sequenceId) {
      return await db.select().from(sequenceEnrollments)
        .where(and(eq(sequenceEnrollments.userId, userId), eq(sequenceEnrollments.sequenceId, sequenceId)));
    }
    return await db.select().from(sequenceEnrollments).where(eq(sequenceEnrollments.userId, userId));
  }

  async enrollLeadInSequence(userId: string, enrollment: InsertSequenceEnrollment): Promise<SequenceEnrollment> {
    const [newEnrollment] = await db.insert(sequenceEnrollments).values({ ...enrollment, userId }).returning();
    await db.update(emailSequences)
      .set({ enrolledCount: sql`${emailSequences.enrolledCount} + 1` })
      .where(eq(emailSequences.id, enrollment.sequenceId));
    return newEnrollment;
  }

  async saveAiContent(userId: string, content: InsertAiGeneratedContent): Promise<AiGeneratedContent> {
    const [saved] = await db.insert(aiGeneratedContent).values({ ...content, userId }).returning();
    return saved;
  }

  async getAiContent(userId: string, leadId?: number): Promise<AiGeneratedContent[]> {
    if (leadId) {
      return await db.select().from(aiGeneratedContent)
        .where(and(eq(aiGeneratedContent.userId, userId), eq(aiGeneratedContent.leadId, leadId)))
        .orderBy(desc(aiGeneratedContent.createdAt));
    }
    return await db.select().from(aiGeneratedContent)
      .where(eq(aiGeneratedContent.userId, userId))
      .orderBy(desc(aiGeneratedContent.createdAt));
  }

  async updateLeadScore(id: number, userId: string, score: number): Promise<Lead | undefined> {
    const [updated] = await db.update(leads).set({ score }).where(and(eq(leads.id, id), eq(leads.userId, userId))).returning();
    return updated;
  }

  async getGeneticTasks(userId: string): Promise<AgenticTask[]> {
    return this.getAgenticTasks(userId);
  }

  async createGeneticTask(userId: string, task: InsertAgenticTask): Promise<AgenticTask> {
    return this.createAgenticTask(userId, task);
  }
}

export const storage = new DatabaseStorage();
