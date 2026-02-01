import { useDashboardAnalytics } from "@/hooks/use-analytics";
import { useLeads } from "@/hooks/use-leads";
import { useOpportunities } from "@/hooks/use-opportunities";
import { useAgenticTasks } from "@/hooks/use-agentic-tasks";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useClients } from "@/hooks/use-clients";
import { useAIStatus } from "@/hooks/use-ai-features";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Users, DollarSign, Activity, TrendingUp, Mail, Bot, Target, Heart, Zap, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  const { data: tasks } = useAgenticTasks();
  const { data: campaigns } = useCampaigns();
  const { data: clients } = useClients();
  const { data: aiStatus } = useAIStatus();

  const totalLeads = leads?.length || 0;
  const totalClients = clients?.length || 0;
  const pipelineValue = opportunities?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
  const activeTasks = tasks?.filter(t => t.isActive).length || 0;
  const activeCampaigns = campaigns?.filter(c => c.status === "active").length || 0;
  const healthyClients = clients?.filter(c => (c.healthScore || 0) >= 70).length || 0;
  
  const closedWon = opportunities?.filter(o => o.stage === "closed-won").length || 0;
  const totalOpps = opportunities?.length || 0;
  const conversionRate = totalOpps > 0 ? Math.round((closedWon / totalOpps) * 100) : 0;

  const salesData = [
    { name: 'Mon', value: 4200, leads: 12 },
    { name: 'Tue', value: 3800, leads: 8 },
    { name: 'Wed', value: 5100, leads: 15 },
    { name: 'Thu', value: 4500, leads: 10 },
    { name: 'Fri', value: 6200, leads: 18 },
    { name: 'Sat', value: 3200, leads: 6 },
    { name: 'Sun', value: 2800, leads: 4 },
  ];

  const sourceData = [
    { name: 'LinkedIn', value: 35, color: '#0077B5' },
    { name: 'Instagram', value: 25, color: '#E4405F' },
    { name: 'Google', value: 20, color: '#4285F4' },
    { name: 'Referral', value: 15, color: '#10B981' },
    { name: 'Other', value: 5, color: '#6B7280' },
  ];

  const stageData = opportunities?.reduce((acc, opp) => {
    const stage = opp.stage || 'prospecting';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pipelineStages = [
    { name: 'Prospecting', count: stageData['prospecting'] || 0, color: 'bg-blue-500' },
    { name: 'Qualified', count: stageData['qualified'] || 0, color: 'bg-cyan-500' },
    { name: 'Proposal', count: stageData['proposal'] || 0, color: 'bg-purple-500' },
    { name: 'Negotiation', count: stageData['negotiation'] || 0, color: 'bg-orange-500' },
    { name: 'Closed Won', count: stageData['closed-won'] || 0, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-8">
      {aiStatus && !aiStatus.configured && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>AI features are running in demo mode. Add your OpenAI API key to enable full AI capabilities.</span>
            <Badge variant="outline" className="text-amber-500 border-amber-500/30">Demo Mode</Badge>
          </AlertDescription>
        </Alert>
      )}
      {aiStatus && aiStatus.configured && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>AI features are fully configured and ready to use.</span>
            <Badge variant="outline" className="text-green-500 border-green-500/30">AI Enabled</Badge>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Your sales command center. Track growth across all channels.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" data-testid="button-view-leads">View Leads</Button>
          </Link>
          <Link href="/agentic-mode">
            <Button size="sm" className="bg-accent" data-testid="button-agentic-mode">
              <Bot className="w-4 h-4 mr-2" />
              Agentic Mode
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <div className="flex items-center text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +20.1% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${pipelineValue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +12% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {healthyClients} healthy
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{activeTasks}</div>
            <div className="text-xs text-muted-foreground">Running 24/7</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <div className="text-xs text-muted-foreground">Email outreach</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="flex items-center text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +2.4% this week
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-muted-foreground">{source.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelineStages.map((stage) => (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{stage.name}</span>
                  <span className="font-medium">{stage.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${totalOpps > 0 ? (stage.count / totalOpps) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { icon: Users, color: 'text-blue-500', message: 'New lead captured from LinkedIn', time: '2m ago' },
                { icon: Mail, color: 'text-purple-500', message: 'Email campaign sent to 50 leads', time: '15m ago' },
                { icon: Bot, color: 'text-accent', message: 'AI agent identified high-value prospect', time: '1h ago' },
                { icon: DollarSign, color: 'text-green-500', message: 'Deal closed: $12,500', time: '2h ago' },
                { icon: Target, color: 'text-orange-500', message: 'New opportunity created', time: '3h ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-muted/50 ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/leads" className="block">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manage Leads</h3>
                  <p className="text-sm text-muted-foreground">Import, track, and convert leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/campaigns" className="block">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Mail className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Campaigns</h3>
                  <p className="text-sm text-muted-foreground">Automate outreach sequences</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agentic-mode" className="block">
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/20">
                  <Bot className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Agentic Mode</h3>
                  <p className="text-sm text-muted-foreground">Deploy AI agents for growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
