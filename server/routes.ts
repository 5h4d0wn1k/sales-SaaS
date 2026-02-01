import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

    res.json({
      totalLeads: leadsList.length,
      totalClients: clientsList.length,
      pipelineValue,
      activeCampaigns,
      activeAgents,
      healthyClients,
      conversionRate,
      recentActivity: [
        { type: 'lead', message: 'New lead captured from LinkedIn', timestamp: new Date().toISOString() },
        { type: 'campaign', message: 'Email campaign sent successfully', timestamp: new Date().toISOString() },
        { type: 'agent', message: 'AI agent completed market analysis', timestamp: new Date().toISOString() },
      ],
    });
  });

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  console.log("Database seeded successfully (if logic was added).");
}
