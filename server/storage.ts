import { db } from "./db";
import {
  leads, opportunities, clients, campaigns, emailTemplates, customerSuccess,
  subscriptions, agenticTasks, analytics,
  type InsertLead, type InsertOpportunity, type InsertClient, type InsertCampaign,
  type InsertEmailTemplate, type InsertCustomerSuccessTask, type InsertAgenticTask,
  type Lead, type Opportunity, type Client, type Campaign, type EmailTemplate,
  type CustomerSuccessTask, type Subscription, type AgenticTask
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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
    const [updated] = await db.update(agenticTasks).set({ isActive: !task.isActive }).where(eq(agenticTasks.id, id)).returning();
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
