import { z } from 'zod';
import { 
  insertLeadSchema, insertOpportunitySchema, insertClientSchema,
  insertCampaignSchema, insertEmailTemplateSchema, insertCustomerSuccessSchema,
  insertAgenticTaskSchema,
  leads, opportunities, clients, campaigns, emailTemplates, customerSuccess, 
  subscriptions, agenticTasks 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  leads: {
    list: {
      method: 'GET' as const,
      path: '/api/leads',
      responses: {
        200: z.array(z.custom<typeof leads.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/leads',
      input: insertLeadSchema,
      responses: {
        201: z.custom<typeof leads.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/leads/:id',
      input: insertLeadSchema.partial(),
      responses: {
        200: z.custom<typeof leads.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/leads/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  opportunities: {
    list: {
      method: 'GET' as const,
      path: '/api/opportunities',
      responses: {
        200: z.array(z.custom<typeof opportunities.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/opportunities',
      input: insertOpportunitySchema,
      responses: {
        201: z.custom<typeof opportunities.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/opportunities/:id',
      input: insertOpportunitySchema.partial(),
      responses: {
        200: z.custom<typeof opportunities.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/opportunities/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id',
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  campaigns: {
    list: {
      method: 'GET' as const,
      path: '/api/campaigns',
      responses: {
        200: z.array(z.custom<typeof campaigns.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/campaigns',
      input: insertCampaignSchema,
      responses: {
        201: z.custom<typeof campaigns.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/campaigns/:id',
      input: insertCampaignSchema.partial(),
      responses: {
        200: z.custom<typeof campaigns.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/campaigns/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  emailTemplates: {
    list: {
      method: 'GET' as const,
      path: '/api/email-templates',
      responses: {
        200: z.array(z.custom<typeof emailTemplates.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/email-templates',
      input: insertEmailTemplateSchema,
      responses: {
        201: z.custom<typeof emailTemplates.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/email-templates/:id',
      input: insertEmailTemplateSchema.partial(),
      responses: {
        200: z.custom<typeof emailTemplates.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/email-templates/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  customerSuccess: {
    list: {
      method: 'GET' as const,
      path: '/api/customer-success',
      responses: {
        200: z.array(z.custom<typeof customerSuccess.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customer-success',
      input: insertCustomerSuccessSchema,
      responses: {
        201: z.custom<typeof customerSuccess.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/customer-success/:id',
      input: insertCustomerSuccessSchema.partial(),
      responses: {
        200: z.custom<typeof customerSuccess.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customer-success/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  agenticTasks: {
    list: {
      method: 'GET' as const,
      path: '/api/agentic-tasks',
      responses: {
        200: z.array(z.custom<typeof agenticTasks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/agentic-tasks',
      input: insertAgenticTaskSchema,
      responses: {
        201: z.custom<typeof agenticTasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/agentic-tasks/:id',
      input: insertAgenticTaskSchema.partial(),
      responses: {
        200: z.custom<typeof agenticTasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/agentic-tasks/:id/toggle',
      responses: {
        200: z.custom<typeof agenticTasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  geneticTasks: {
    list: {
      method: 'GET' as const,
      path: '/api/agentic-tasks',
      responses: {
        200: z.array(z.custom<typeof agenticTasks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/agentic-tasks',
      input: insertAgenticTaskSchema,
      responses: {
        201: z.custom<typeof agenticTasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  subscriptions: {
    get: {
      method: 'GET' as const,
      path: '/api/subscription',
      responses: {
        200: z.custom<typeof subscriptions.$inferSelect>(),
      },
    },
  },
  analytics: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/analytics/dashboard',
      responses: {
        200: z.object({
          totalLeads: z.number(),
          totalClients: z.number(),
          pipelineValue: z.number(),
          activeCampaigns: z.number(),
          activeAgents: z.number(),
          healthyClients: z.number(),
          conversionRate: z.number(),
          recentActivity: z.array(z.object({
            type: z.string(),
            message: z.string(),
            timestamp: z.string(),
          })),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
