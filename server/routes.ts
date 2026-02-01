import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  calculateLeadScore,
  generatePersonalizedContent,
  executeAgentTask,
  analyzeConversation,
  identifyStaleLeads,
} from "./services/ai-sales";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerChatRoutes(app);

  // Leads
  app.get(api.leads.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const leads = await storage.getLeads(userId);
    res.json(leads);
  });

  app.post(api.leads.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.leads.create.input.parse(req.body);
      const lead = await storage.createLead(userId, input);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.leads.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const input = api.leads.update.input.parse(req.body);
      const lead = await storage.updateLead(id, userId, input);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json(lead);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.leads.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteLead(id, userId);
    res.status(204).send();
  });

  // Opportunities
  app.get(api.opportunities.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const opps = await storage.getOpportunities(userId);
    res.json(opps);
  });

  app.post(api.opportunities.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.opportunities.create.input.parse(req.body);
      const opp = await storage.createOpportunity(userId, input);
      res.status(201).json(opp);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.opportunities.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.opportunities.update.input.parse(req.body);
    const opp = await storage.updateOpportunity(id, userId, input);
    if (!opp) return res.status(404).json({ message: "Opportunity not found" });
    res.json(opp);
  });

  app.delete(api.opportunities.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteOpportunity(id, userId);
    res.status(204).send();
  });

  // Clients
  app.get(api.clients.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const clientsList = await storage.getClients(userId);
    res.json(clientsList);
  });

  app.post(api.clients.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(userId, input);
      res.status(201).json(client);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.clients.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.clients.update.input.parse(req.body);
    const client = await storage.updateClient(id, userId, input);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.delete(api.clients.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteClient(id, userId);
    res.status(204).send();
  });

  // Campaigns
  app.get(api.campaigns.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const campaignsList = await storage.getCampaigns(userId);
    res.json(campaignsList);
  });

  app.post(api.campaigns.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.campaigns.create.input.parse(req.body);
      const campaign = await storage.createCampaign(userId, input);
      res.status(201).json(campaign);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.campaigns.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.campaigns.update.input.parse(req.body);
    const campaign = await storage.updateCampaign(id, userId, input);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json(campaign);
  });

  app.delete(api.campaigns.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteCampaign(id, userId);
    res.status(204).send();
  });

  // Email Templates
  app.get(api.emailTemplates.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const templates = await storage.getEmailTemplates(userId);
    res.json(templates);
  });

  app.post(api.emailTemplates.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.emailTemplates.create.input.parse(req.body);
      const template = await storage.createEmailTemplate(userId, input);
      res.status(201).json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.emailTemplates.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.emailTemplates.update.input.parse(req.body);
    const template = await storage.updateEmailTemplate(id, userId, input);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  app.delete(api.emailTemplates.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteEmailTemplate(id, userId);
    res.status(204).send();
  });

  // Customer Success
  app.get(api.customerSuccess.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const tasks = await storage.getCustomerSuccessTasks(userId);
    res.json(tasks);
  });

  app.post(api.customerSuccess.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.customerSuccess.create.input.parse(req.body);
      const task = await storage.createCustomerSuccessTask(userId, input);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.customerSuccess.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.customerSuccess.update.input.parse(req.body);
    const task = await storage.updateCustomerSuccessTask(id, userId, input);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete(api.customerSuccess.delete.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteCustomerSuccessTask(id, userId);
    res.status(204).send();
  });

  // Agentic Tasks
  app.get(api.agenticTasks.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const tasks = await storage.getAgenticTasks(userId);
    res.json(tasks);
  });

  app.post(api.agenticTasks.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.agenticTasks.create.input.parse(req.body);
      const task = await storage.createAgenticTask(userId, input);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.agenticTasks.update.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const input = api.agenticTasks.update.input.parse(req.body);
    const task = await storage.updateAgenticTask(id, userId, input);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.post(api.agenticTasks.toggle.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const task = await storage.toggleAgenticTask(id, userId);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  // Subscriptions
  app.get(api.subscriptions.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let sub = await storage.getSubscription(userId);
    if (!sub) {
      sub = await storage.createSubscription(userId);
    }
    res.json(sub);
  });

  // Analytics Dashboard
  app.get(api.analytics.dashboard.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const [leadsList, clientsList, opportunitiesList, campaignsList, agenticTasksList] = await Promise.all([
      storage.getLeads(userId),
      storage.getClients(userId),
      storage.getOpportunities(userId),
      storage.getCampaigns(userId),
      storage.getAgenticTasks(userId),
    ]);

    const pipelineValue = opportunitiesList.reduce((acc, o) => acc + (o.value || 0), 0);
    const activeCampaigns = campaignsList.filter(c => c.status === 'active').length;
    const activeAgents = agenticTasksList.filter(t => t.isActive).length;
    const healthyClients = clientsList.filter(c => (c.healthScore || 0) >= 70).length;
    const closedWon = opportunitiesList.filter(o => o.stage === 'closed-won').length;
    const conversionRate = opportunitiesList.length > 0 ? Math.round((closedWon / opportunitiesList.length) * 100) : 0;

    const staleLeads = await identifyStaleLeads(leadsList);

    res.json({
      totalLeads: leadsList.length,
      totalClients: clientsList.length,
      pipelineValue,
      activeCampaigns,
      activeAgents,
      healthyClients,
      conversionRate,
      staleLeadsCount: staleLeads.length,
      staleLeads: staleLeads.slice(0, 5),
      recentActivity: [
        { type: 'lead', message: 'New lead captured from LinkedIn', timestamp: new Date().toISOString() },
        { type: 'campaign', message: 'Email campaign sent successfully', timestamp: new Date().toISOString() },
        { type: 'agent', message: 'AI agent completed market analysis', timestamp: new Date().toISOString() },
      ],
    });
  });

  // Business Profile / Onboarding
  app.get("/api/business-profile", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profile = await storage.getBusinessProfile(userId);
    res.json(profile || null);
  });

  app.post("/api/business-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getBusinessProfile(userId);
      if (existing) {
        const updated = await storage.updateBusinessProfile(userId, req.body);
        return res.json(updated);
      }
      const profile = await storage.createBusinessProfile(userId, req.body);
      res.status(201).json(profile);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Lead Activities
  app.get("/api/leads/:id/activities", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const leadId = parseInt(req.params.id);
    const activities = await storage.getLeadActivities(userId, leadId);
    res.json(activities);
  });

  app.post("/api/leads/:id/activities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const activity = await storage.createLeadActivity(userId, { ...req.body, leadId });
      res.status(201).json(activity);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // AI Lead Scoring
  app.post("/api/leads/:id/score", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const activities = await storage.getLeadActivities(userId, leadId);
      const businessProfile = await storage.getBusinessProfile(userId);
      const scoreResult = await calculateLeadScore(lead, activities, businessProfile);
      
      await storage.updateLeadScore(leadId, userId, scoreResult.score);
      res.json(scoreResult);
    } catch (err) {
      console.error("Score error:", err);
      res.status(500).json({ message: "Scoring failed" });
    }
  });

  // AI Content Generation
  app.post("/api/leads/:id/generate-content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const { contentType } = req.body;
      
      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const businessProfile = await storage.getBusinessProfile(userId);
      if (!businessProfile) {
        return res.status(400).json({ message: "Please complete business onboarding first" });
      }

      const content = await generatePersonalizedContent(lead, businessProfile, contentType || "cold_email");
      
      await storage.saveAiContent(userId, {
        leadId,
        type: contentType || "cold_email",
        content: JSON.stringify(content),
        metadata: { generatedAt: new Date().toISOString() },
      });

      res.json(content);
    } catch (err) {
      console.error("Content generation error:", err);
      res.status(500).json({ message: "Content generation failed" });
    }
  });

  // Execute Agent Task
  app.post("/api/agentic-tasks/:id/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      const tasks = await storage.getAgenticTasks(userId);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });

      const businessProfile = await storage.getBusinessProfile(userId);
      const leads = await storage.getLeads(userId);

      await storage.updateAgenticTaskResult(taskId, userId, null, 10);
      
      const result = await executeAgentTask(task, businessProfile || undefined, leads);
      
      await storage.updateAgenticTaskResult(taskId, userId, result.data, 100);

      res.json(result);
    } catch (err) {
      console.error("Agent execution error:", err);
      res.status(500).json({ message: "Agent execution failed" });
    }
  });

  // Stale Leads Detection
  app.get("/api/leads/stale", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const days = parseInt(req.query.days as string) || 14;
    const leads = await storage.getLeads(userId);
    const staleLeads = await identifyStaleLeads(leads, days);
    res.json(staleLeads);
  });

  // Conversation Analysis
  app.post("/api/analyze-conversation", isAuthenticated, async (req: any, res) => {
    try {
      const { notes, context } = req.body;
      const analysis = await analyzeConversation(notes, context || "sales call");
      res.json(analysis);
    } catch (err) {
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Email Sequences
  app.get("/api/email-sequences", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const sequences = await storage.getEmailSequences(userId);
    res.json(sequences);
  });

  app.post("/api/email-sequences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sequence = await storage.createEmailSequence(userId, req.body);
      res.status(201).json(sequence);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/email-sequences/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const sequence = await storage.updateEmailSequence(id, userId, req.body);
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });
    res.json(sequence);
  });

  app.delete("/api/email-sequences/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    await storage.deleteEmailSequence(id, userId);
    res.status(204).send();
  });

  // Enroll lead in sequence
  app.post("/api/email-sequences/:id/enroll", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sequenceId = parseInt(req.params.id);
      const { leadId } = req.body;
      const enrollment = await storage.enrollLeadInSequence(userId, {
        sequenceId,
        leadId,
        currentStep: 0,
        status: "active",
      });
      res.status(201).json(enrollment);
    } catch (err) {
      res.status(400).json({ message: "Enrollment failed" });
    }
  });

  // Score all leads
  app.post("/api/leads/score-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leads = await storage.getLeads(userId);
      const businessProfile = await storage.getBusinessProfile(userId);
      
      const results = [];
      for (const lead of leads.slice(0, 10)) {
        const activities = await storage.getLeadActivities(userId, lead.id);
        const scoreResult = await calculateLeadScore(lead, activities, businessProfile);
        await storage.updateLeadScore(lead.id, userId, scoreResult.score);
        results.push({ leadId: lead.id, ...scoreResult });
      }
      
      res.json({ scored: results.length, results });
    } catch (err) {
      console.error("Bulk scoring error:", err);
      res.status(500).json({ message: "Bulk scoring failed" });
    }
  });

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  console.log("Database seeded successfully (if logic was added).");
}
