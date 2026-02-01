# SalesGenetics - AI-Powered Sales Automation Platform

## Overview
SalesGenetics is a comprehensive, production-ready sales automation platform designed for businesses of all sizes - from small shops to trillion-dollar enterprises. It leverages AI agents ("Agentic Mode") to optimize sales processes, identify growth opportunities, automate networking, and continuously improve performance 24/7.

## Key Features

### Core Sales Tools
- **Lead Management**: Import, track, and score leads from multiple sources (LinkedIn, Instagram, Google, freelance platforms, referrals)
- **AI Lead Scoring**: Predictive scoring with multi-factor analysis (engagement, company size, behavior, source quality)
- **Lead Activity Timeline**: Track all interactions (emails, calls, notes, meetings) with timestamps
- **Stale Lead Detection**: Automatic alerts when leads go cold (no activity in 14+ days)
- **Opportunity Pipeline**: Visual pipeline management with stages (Prospecting → Qualified → Proposal → Negotiation → Closed)
- **Client Management**: Full CRM with health scores, lifetime value tracking, and tiered client classification

### Automation & AI
- **Business Onboarding Wizard**: First-time setup captures business type, industry, target market, ideal customer profile, and value proposition to configure AI agents
- **AI Content Generation**: Generate personalized emails, proposals, and talking points for each prospect
- **Agentic Mode with Execution**: Deploy and actually run AI agents that work 24/7:
  - Lead Scraper - Automatically find leads matching your ideal customer profile
  - Email Outreach - Generate personalized email sequences based on your value proposition
  - Market Analysis - Identify growth opportunities and market trends
  - Competitor Monitor - Track competitor activities and pricing changes
  - Customer Insights - Predict churn and analyze behavior patterns
  - Sales Optimizer - Optimize pipeline and suggest improvements
- **Conversation Intelligence**: AI analysis of sales notes with coaching suggestions

### Growth Tools
- **Email Campaigns**: Create, schedule, and track multi-channel outreach campaigns
- **Email Sequences**: Multi-step automated follow-up sequences with lead enrollment
- **Customer Success**: Monitor client health scores, identify at-risk accounts, prevent churn
- **Analytics Dashboard**: Comprehensive metrics, stale leads alerts, pipeline visualization

### Business Features
- **5 Subscription Tiers**: Free, Basic ($29), Pro ($79), Business ($199), Enterprise ($999)
- **User Authentication**: Secure login via Replit Auth (Google, GitHub, email)
- **Production Ready**: Fully deployable via Replit Publishing

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Replit Auth (OpenID Connect)
- **AI Integration**: OpenAI via Replit AI Integrations
- **Styling**: Tailwind CSS + Shadcn/UI
- **Charts**: Recharts

## Project Structure
```
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components (Layout, Modals)
│   │   ├── hooks/             # Custom React hooks for API calls
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx      # Main dashboard with analytics
│   │   │   ├── Leads.tsx          # Lead management
│   │   │   ├── Opportunities.tsx  # Sales pipeline
│   │   │   ├── Clients.tsx        # Client CRM
│   │   │   ├── Campaigns.tsx      # Email campaigns
│   │   │   ├── AgenticMode.tsx    # AI agents control
│   │   │   ├── CustomerSuccess.tsx # Client health monitoring
│   │   │   ├── Subscription.tsx   # Billing/plans
│   │   │   └── Landing.tsx        # Public landing page
│   │   └── lib/               # Utilities
├── server/                    # Backend Express application
│   ├── replit_integrations/   # Auth & AI integrations
│   ├── routes.ts              # All API routes
│   └── storage.ts             # Database operations
├── shared/                    # Shared types and schemas
│   ├── schema.ts              # Drizzle database schema
│   └── routes.ts              # API contract definitions
```

## Database Tables
- `users` - User accounts (Replit Auth)
- `sessions` - Session storage
- `leads` - Sales leads with source tracking
- `opportunities` - Sales pipeline
- `clients` - Client CRM data
- `campaigns` - Email campaigns
- `email_templates` - Reusable templates
- `customer_success` - Success tasks
- `agentic_tasks` - AI agent configurations
- `subscriptions` - User subscription tiers
- `analytics` - Performance metrics

## API Endpoints

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Opportunities
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity
- `PUT /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity

### Clients
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Agentic Tasks
- `GET /api/agentic-tasks` - List AI agents
- `POST /api/agentic-tasks` - Deploy new agent
- `POST /api/agentic-tasks/:id/toggle` - Start/stop agent

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics

## Running the Project
The application runs via the "Start application" workflow which executes `npm run dev`.

## Deployment
Ready for deployment via Replit's publishing system. All environment variables are managed through Replit secrets.

## User Preferences
- Dark mode theme with professional Blues/Teals/Slates color scheme
- Agentic (not genetic) terminology for AI features
- Comprehensive features for all business sizes
