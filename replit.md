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

### Advanced Features (New)
- **Multi-Channel Orchestration**: AI-determined optimal channel selection (email, LinkedIn, phone, SMS)
- **Email Tracking**: Real-time tracking of opens, clicks, and replies with pixel tracking
- **Autonomous Agent Execution**: Agents that can analyze data, suggest actions, and provide strategic insights
- **Conversation Intelligence**: Deep analysis of sales conversations with sentiment scoring and win probability
- **Sales Coaching**: AI-powered coaching with performance analysis and improvement suggestions
- **Meeting Preparation**: AI-generated agendas, talking points, and objection handling
- **Pipeline Forecasting**: AI-driven revenue forecasts with confidence scoring
- **Automation Rules**: Create custom automation workflows with triggers and actions
- **Rate Limiting**: Production-ready rate limiting for API protection
- **Request Logging**: Comprehensive logging for debugging and analytics

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
│   ├── middleware/            # Rate limiting & logging
│   ├── replit_integrations/   # Auth & AI integrations
│   ├── services/              # AI services
│   │   ├── ai-sales.ts            # Lead scoring & content generation
│   │   ├── autonomous-agents.ts   # 6 autonomous AI agents
│   │   ├── conversation-intelligence.ts  # Call/meeting analysis
│   │   ├── email-service.ts       # Email sending & tracking
│   │   └── multi-channel.ts       # Multi-channel orchestration
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
- `lead_activities` - Lead interaction timeline
- `opportunities` - Sales pipeline
- `clients` - Client CRM data
- `campaigns` - Email campaigns
- `email_templates` - Reusable templates
- `email_sequences` - Multi-step sequences
- `sequence_enrollments` - Lead-sequence mapping
- `email_tracking` - Open/click/reply tracking
- `scheduled_outreach` - Scheduled multi-channel outreach
- `meeting_schedules` - Meeting management
- `sales_coaching` - Conversation analysis sessions
- `automation_rules` - Custom automation workflows
- `pipeline_forecasts` - AI revenue forecasts
- `customer_success` - Success tasks
- `agentic_tasks` - AI agent configurations
- `business_profiles` - Company onboarding data
- `subscriptions` - User subscription tiers
- `ai_generated_content` - Cached AI content

## API Endpoints

### Core CRUD
- Leads: `GET/POST/PUT/DELETE /api/leads`
- Opportunities: `GET/POST/PUT/DELETE /api/opportunities`
- Clients: `GET/POST/PUT/DELETE /api/clients`
- Campaigns: `GET/POST/PUT/DELETE /api/campaigns`

### AI Features
- `POST /api/leads/:id/score` - AI lead scoring
- `POST /api/leads/:id/generate-content` - AI content generation
- `POST /api/leads/score-all` - Bulk scoring
- `POST /api/agentic-tasks/:id/execute-autonomous` - Run autonomous agent
- `POST /api/analyze-conversation` - Conversation analysis

### Multi-Channel
- `POST /api/leads/:id/optimal-channel` - Get optimal channel
- `POST /api/leads/:id/outreach-sequence` - Generate outreach sequence
- `POST /api/leads/:id/generate-channel-content` - Channel-specific content
- `GET /api/scheduled-outreach` - List scheduled outreach
- `POST /api/scheduled-outreach/:id/execute` - Execute outreach

### Email Tracking
- `GET /api/email-tracking` - Get tracking data
- `GET /api/email-tracking/stats` - Get email stats
- `GET /api/email-tracking/open/:emailId` - Track opens (pixel)
- `GET /api/email-tracking/click/:emailId` - Track clicks (redirect)
- `POST /api/campaigns/:id/send` - Send campaign emails

### Meetings & Coaching
- `GET/POST /api/meetings` - Meeting management
- `POST /api/meetings/:id/prep` - AI meeting prep
- `POST /api/conversation-intelligence/analyze` - Deep conversation analysis
- `GET /api/sales-coaching` - Get coaching sessions
- `POST /api/sales-coaching/insights` - Get coaching insights

### Automation & Forecasting
- `GET/POST /api/automation-rules` - Automation rules
- `POST /api/automation-rules/:id/toggle` - Toggle rule
- `GET /api/pipeline-forecast` - AI pipeline forecast

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

## Email Integration Note
Email sending currently works in simulation mode. To enable real email sending:
1. Upgrade to Replit paid plan
2. Set up SendGrid or Resend integration
3. Configure API keys in secrets

The email tracking infrastructure (opens, clicks, replies) is fully functional and ready for production use.
