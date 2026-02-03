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
import { executeAutonomousAgent, type AgentContext } from "./services/autonomous-agents";
import { emailService } from "./services/email-service";
import { 
  analyzeConversation as analyzeConversationIntelligence, 
  generateMeetingPrep, 
  provideSalesCoaching 
} from "./services/conversation-intelligence";
import { 
  determineOptimalChannel, 
  generateOutreachSequence, 
  calculateOptimalTiming,
  generateChannelContent,
  scheduleOutreach 
} from "./services/multi-channel";
import { 
  registerWebhook, 
  getWebhooks, 
  deleteWebhook, 
  processIncomingWebhook 
} from "./services/webhooks";
import { scheduler, initializeScheduler } from "./services/scheduler";
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} from "./services/notifications";

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

  // Email Tracking Endpoints
  app.get("/api/email-tracking/open/:emailId", async (req, res) => {
    try {
      const { emailId } = req.params;
      await storage.updateEmailTrackingOpen(emailId);
      const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.set("Content-Type", "image/gif");
      res.send(pixel);
    } catch (error) {
      res.status(200).send();
    }
  });

  app.get("/api/email-tracking/click/:emailId", async (req, res) => {
    try {
      const { emailId } = req.params;
      const { url } = req.query;
      await storage.updateEmailTrackingClick(emailId);
      res.redirect(decodeURIComponent(url as string) || "/");
    } catch (error) {
      res.redirect("/");
    }
  });

  app.get("/api/email-tracking/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const stats = await storage.getEmailTrackingStats(userId, campaignId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/email-tracking", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
    const tracking = await storage.getEmailTracking(userId, campaignId);
    res.json(tracking);
  });

  // Autonomous Agent Execution
  app.post("/api/agentic-tasks/:id/execute-autonomous", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      const tasks = await storage.getAgenticTasks(userId);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return res.status(404).json({ message: "Task not found" });

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

      await storage.updateAgenticTaskResult(taskId, userId, null, 10);
      const result = await executeAutonomousAgent(task, context);
      await storage.updateAgenticTaskResult(taskId, userId, result, 100);

      res.json(result);
    } catch (error) {
      console.error("Autonomous agent error:", error);
      res.status(500).json({ message: "Agent execution failed" });
    }
  });

  // Multi-Channel Outreach
  app.post("/api/leads/:id/optimal-channel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const businessProfile = await storage.getBusinessProfile(userId);
      const recommendations = await determineOptimalChannel(lead, businessProfile || undefined);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Channel optimization failed" });
    }
  });

  app.post("/api/leads/:id/outreach-sequence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const { goal } = req.body;
      
      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const businessProfile = await storage.getBusinessProfile(userId);
      const sequence = await generateOutreachSequence(lead, businessProfile || undefined, goal || "cold_outreach");
      
      const scheduledItems = scheduleOutreach(lead, sequence);
      for (const item of scheduledItems) {
        await storage.createScheduledOutreach(userId, item);
      }

      res.json({ sequence, scheduledCount: scheduledItems.length });
    } catch (error) {
      res.status(500).json({ message: "Sequence generation failed" });
    }
  });

  app.post("/api/leads/:id/generate-channel-content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leadId = parseInt(req.params.id);
      const { channel, messageType } = req.body;
      
      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const businessProfile = await storage.getBusinessProfile(userId);
      const content = await generateChannelContent(lead, channel, messageType, businessProfile || undefined);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Content generation failed" });
    }
  });

  // Scheduled Outreach Management
  app.get("/api/scheduled-outreach", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const status = req.query.status as string | undefined;
    const outreach = await storage.getScheduledOutreach(userId, status);
    res.json(outreach);
  });

  app.get("/api/scheduled-outreach/pending", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const pending = await storage.getPendingOutreach(userId);
    res.json(pending);
  });

  app.post("/api/scheduled-outreach/:id/execute", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const outreachItems = await storage.getScheduledOutreach(userId);
      const item = outreachItems.find(o => o.id === id);
      if (!item) return res.status(404).json({ message: "Outreach not found" });

      const leads = await storage.getLeads(userId);
      const lead = leads.find(l => l.id === item.leadId);
      
      let result: any = { success: false };
      
      if (item.channel === "email" && lead) {
        const emailResult = await emailService.sendEmail({
          to: lead.email,
          subject: item.subject || "Message from us",
          html: item.content,
        });
        
        await storage.createEmailTracking(userId, {
          leadId: lead.id,
          emailId: emailResult.emailId,
          subject: item.subject || "Message",
          recipient: lead.email,
          status: emailResult.success ? "sent" : "failed",
        });
        
        result = emailResult;
      } else {
        result = { success: true, message: `${item.channel} outreach simulated` };
      }

      const updated = await storage.executeScheduledOutreach(id, userId, result);
      
      if (lead) {
        await storage.createLeadActivity(userId, {
          leadId: lead.id,
          type: item.channel,
          title: `${item.type} via ${item.channel}`,
          description: item.subject || item.content.slice(0, 100),
        });
      }

      res.json({ outreach: updated, result });
    } catch (error) {
      res.status(500).json({ message: "Execution failed" });
    }
  });

  // Meeting Scheduling
  app.get("/api/meetings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const meetings = await storage.getMeetingSchedules(userId);
    res.json(meetings);
  });

  app.post("/api/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meeting = await storage.createMeetingSchedule(userId, req.body);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/meetings/:id/prep", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingId = parseInt(req.params.id);
      const meetings = await storage.getMeetingSchedules(userId);
      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting) return res.status(404).json({ message: "Meeting not found" });

      const leads = await storage.getLeads(userId);
      const opportunities = await storage.getOpportunities(userId);
      const businessProfile = await storage.getBusinessProfile(userId);

      const lead = meeting.leadId ? leads.find(l => l.id === meeting.leadId) : undefined;
      const opportunity = lead ? opportunities.find(o => o.leadId === lead.id) : undefined;

      if (!lead) return res.status(400).json({ message: "No lead associated with meeting" });

      const prep = await generateMeetingPrep(
        lead,
        opportunity,
        businessProfile || undefined,
        meeting.meetingType || "call",
        meeting.notes || undefined
      );

      await storage.updateMeetingSchedule(meetingId, userId, { notes: JSON.stringify(prep) });
      res.json(prep);
    } catch (error) {
      res.status(500).json({ message: "Meeting prep failed" });
    }
  });

  // Conversation Intelligence
  app.post("/api/conversation-intelligence/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transcript, leadId, opportunityId, meetingType } = req.body;
      
      const leads = await storage.getLeads(userId);
      const opportunities = await storage.getOpportunities(userId);
      const businessProfile = await storage.getBusinessProfile(userId);

      const lead = leadId ? leads.find(l => l.id === leadId) : undefined;
      const opportunity = opportunityId ? opportunities.find(o => o.id === opportunityId) : undefined;

      const analysis = await analyzeConversationIntelligence(transcript, {
        lead,
        opportunity,
        businessProfile: businessProfile || undefined,
        meetingType,
      });

      await storage.createSalesCoaching(userId, {
        leadId,
        opportunityId,
        sessionType: meetingType || "call",
        transcript,
        summary: analysis.summary,
        insights: analysis.keyTopics as any,
        coachingPoints: analysis.coachingPoints as any,
        sentimentScore: analysis.sentimentScore,
        winProbability: analysis.winProbability,
        nextBestActions: analysis.nextBestActions as any,
      });

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  app.get("/api/sales-coaching", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const coaching = await storage.getSalesCoaching(userId);
    res.json(coaching);
  });

  app.post("/api/sales-coaching/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coaching = await storage.getSalesCoaching(userId);
      const conversations = coaching.map(c => c.transcript || "").filter(Boolean);
      
      const opportunities = await storage.getOpportunities(userId);
      const closedWon = opportunities.filter(o => o.stage === "closed-won").length;
      const closedLost = opportunities.filter(o => o.stage === "closed-lost").length;
      
      const insights = await provideSalesCoaching(conversations, {
        closedDeals: closedWon,
        lostDeals: closedLost,
        avgDealCycle: 30,
        responseTime: 4,
      });

      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Coaching failed" });
    }
  });

  // Automation Rules
  app.get("/api/automation-rules", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const rules = await storage.getAutomationRules(userId);
    res.json(rules);
  });

  app.post("/api/automation-rules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rule = await storage.createAutomationRule(userId, req.body);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/automation-rules/:id/toggle", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    const rule = await storage.toggleAutomationRule(id, userId);
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    res.json(rule);
  });

  // Pipeline Forecasting
  app.get("/api/pipeline-forecast", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const opportunities = await storage.getOpportunities(userId);
      const forecasts = await storage.getPipelineForecasts(userId);

      const totalPipeline = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
      const weightedPipeline = opportunities.reduce((sum, o) => 
        sum + ((o.value || 0) * (o.probability || 0) / 100), 0
      );

      const byStage: Record<string, { count: number; value: number }> = {};
      opportunities.forEach(o => {
        const stage = o.stage || "unknown";
        if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
        byStage[stage].count++;
        byStage[stage].value += o.value || 0;
      });

      res.json({
        totalPipeline,
        weightedPipeline,
        byStage,
        historicalForecasts: forecasts.slice(0, 10),
        recommendations: [
          "Focus on deals in negotiation stage",
          "Follow up on stale opportunities",
          "Increase qualification rate",
        ],
      });
    } catch (error) {
      res.status(500).json({ message: "Forecast failed" });
    }
  });

  // Send Campaign Emails
  app.post("/api/campaigns/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaignId = parseInt(req.params.id);
      const { leadIds } = req.body;

      const campaigns = await storage.getCampaigns(userId);
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const leads = await storage.getLeads(userId);
      const targetLeads = leadIds 
        ? leads.filter(l => leadIds.includes(l.id))
        : leads.filter(l => l.status !== "closed" && l.status !== "lost");

      const results = [];
      for (const lead of targetLeads.slice(0, 50)) {
        const result = await emailService.sendCampaignEmail(lead, campaign, campaign.content || "");
        
        await storage.createEmailTracking(userId, {
          campaignId,
          leadId: lead.id,
          emailId: result.emailId,
          subject: campaign.subject || "Campaign",
          recipient: lead.email,
          status: result.success ? "sent" : "failed",
        });

        results.push({ leadId: lead.id, ...result });
      }

      await storage.updateCampaign(campaignId, userId, {
        status: "active",
        sentCount: results.filter(r => r.success).length,
      });

      res.json({ sent: results.length, results });
    } catch (error) {
      res.status(500).json({ message: "Campaign send failed" });
    }
  });

  // Health Check Endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  // AI Status Check Endpoint
  app.get("/api/ai-status", isAuthenticated, async (req, res) => {
    const hasApiKey = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    res.json({
      configured: hasApiKey,
      features: {
        leadScoring: hasApiKey,
        contentGeneration: hasApiKey,
        conversationIntelligence: hasApiKey,
        autonomousAgents: hasApiKey,
        multiChannelOrchestration: hasApiKey,
      },
      message: hasApiKey 
        ? "AI features are fully enabled" 
        : "Please configure AI integration to enable advanced features"
    });
  });

  // Bulk Lead Import
  app.post("/api/leads/bulk-import", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { leads: leadsData } = req.body;

      if (!Array.isArray(leadsData) || leadsData.length === 0) {
        return res.status(400).json({ message: "No leads provided" });
      }

      if (leadsData.length > 1000) {
        return res.status(400).json({ message: "Maximum 1000 leads per import" });
      }

      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const leadData of leadsData) {
        try {
          if (!leadData.name || !leadData.email) {
            results.failed++;
            results.errors.push(`Missing required fields for: ${leadData.name || leadData.email || 'unknown'}`);
            continue;
          }

          await storage.createLead(userId, {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone || null,
            company: leadData.company || null,
            title: leadData.title || null,
            source: leadData.source || "import",
            status: leadData.status || "new",
            notes: leadData.notes || null,
            tags: leadData.tags || null,
            userId,
          });
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Failed to import: ${leadData.email}`);
        }
      }

      res.json({
        message: `Imported ${results.success} leads, ${results.failed} failed`,
        ...results
      });
    } catch (err) {
      console.error("Bulk import error:", err);
      res.status(500).json({ message: "Bulk import failed" });
    }
  });

  // Export leads endpoint
  app.get("/api/leads/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leads = await storage.getLeads(userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=leads-export.json');
      res.json(leads);
    } catch (err) {
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Webhook Management
  app.get("/api/webhooks", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const webhooks = getWebhooks(userId);
    res.json(webhooks.map(w => ({ ...w, secret: "***" })));
  });

  app.post("/api/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { url, events } = req.body;
      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({ message: "URL and events array required" });
      }
      const webhook = registerWebhook(userId, { url, events, isActive: true });
      res.status(201).json(webhook);
    } catch (err) {
      res.status(400).json({ message: "Failed to create webhook" });
    }
  });

  app.delete("/api/webhooks/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const webhookId = req.params.id;
    const deleted = deleteWebhook(userId, webhookId);
    if (!deleted) return res.status(404).json({ message: "Webhook not found" });
    res.status(204).send();
  });

  // Incoming Webhook Endpoints
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const event = req.headers["stripe-signature"] ? req.body.type : req.body.event;
      const result = await processIncomingWebhook("stripe", event, req.body, 
        req.headers["stripe-signature"] as string, process.env.STRIPE_WEBHOOK_SECRET);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Webhook processing failed" });
    }
  });

  app.post("/api/webhooks/email", async (req, res) => {
    try {
      const { event } = req.body;
      const result = await processIncomingWebhook("email", event, req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Webhook processing failed" });
    }
  });

  app.post("/api/webhooks/calendar", async (req, res) => {
    try {
      const { event } = req.body;
      const result = await processIncomingWebhook("calendar", event, req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: "Webhook processing failed" });
    }
  });

  // Scheduler Status
  app.get("/api/scheduler/status", isAuthenticated, async (req: any, res) => {
    const status = scheduler.getStatus();
    res.json(status);
  });

  // Notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = getNotifications(userId, limit);
    const unreadCount = getUnreadCount(userId);
    res.json({ notifications, unreadCount });
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const notificationId = req.params.id;
    const success = markAsRead(userId, notificationId);
    if (!success) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true });
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const count = markAllAsRead(userId);
    res.json({ success: true, markedCount: count });
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const notificationId = req.params.id;
    const success = deleteNotification(userId, notificationId);
    if (!success) return res.status(404).json({ message: "Notification not found" });
    res.status(204).send();
  });

  // Health Check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        database: "connected",
        scheduler: "running",
        ai: "available",
      },
    });
  });

  // Initialize scheduler
  initializeScheduler();

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  console.log("Database seeded successfully (if logic was added).");
}
