import { useState } from "react";
import { useAgenticTasks, useCreateAgenticTask, useToggleAgenticTask } from "@/hooks/use-agentic-tasks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Bot, Plus, Zap, Brain, TrendingUp, Users, Mail, Search, Globe, Play, Pause, Settings } from "lucide-react";
import type { InsertAgenticTask } from "@shared/schema";

const agentTypes = [
  { id: "lead_scraper", name: "Lead Scraper", icon: Search, description: "Automatically scrape leads from LinkedIn, Instagram, Google, and freelance platforms" },
  { id: "email_outreach", name: "Email Outreach", icon: Mail, description: "Send personalized email sequences to leads automatically" },
  { id: "market_analysis", name: "Market Analysis", icon: TrendingUp, description: "Analyze market trends and identify growth opportunities" },
  { id: "competitor_monitor", name: "Competitor Monitor", icon: Globe, description: "Track competitor activities and pricing changes" },
  { id: "customer_insights", name: "Customer Insights", icon: Users, description: "Analyze customer behavior and predict churn" },
  { id: "sales_optimizer", name: "Sales Optimizer", icon: Zap, description: "Optimize your sales pipeline and suggest improvements" },
];

export default function AgenticMode() {
  const { data: tasks, isLoading } = useAgenticTasks();
  const createTask = useCreateAgenticTask();
  const toggleTask = useToggleAgenticTask();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState<InsertAgenticTask>({
    userId: "",
    type: "lead_scraper",
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask.mutateAsync(formData);
    setIsOpen(false);
    setFormData({ userId: "", type: "lead_scraper", name: "", description: "" });
  };

  const activeTasks = tasks?.filter(t => t.isActive) || [];
  const inactiveTasks = tasks?.filter(t => !t.isActive) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <Brain className="w-8 h-8 text-accent" />
            Agentic Mode
          </h2>
          <p className="text-muted-foreground">AI agents that work 24/7 to grow your business.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90" data-testid="button-create-agent">
              <Plus className="w-4 h-4 mr-2" />
              Deploy Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Deploy New AI Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Agent Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger data-testid="select-agent-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input 
                  data-testid="input-agent-name"
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g., LinkedIn Lead Hunter"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  data-testid="input-agent-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this agent should focus on..."
                />
              </div>
              <Button type="submit" className="w-full bg-accent" data-testid="button-deploy-agent">
                Deploy Agent
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-3xl font-bold text-accent">{activeTasks.length}</p>
              </div>
              <Bot className="w-10 h-10 text-accent/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agents</p>
                <p className="text-3xl font-bold">{tasks?.length || 0}</p>
              </div>
              <Zap className="w-10 h-10 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-3xl font-bold">{tasks?.filter(t => t.status === "completed").length || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card key={type.id} className="bg-card/50 border-dashed hover-elevate cursor-pointer" onClick={() => { setFormData({ ...formData, type: type.id, name: type.name }); setIsOpen(true); }}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{type.name}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-card/50">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No agents deployed yet. Choose an agent type above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeTasks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Active Agents
              </h3>
              {activeTasks.map((task) => {
                const agentType = agentTypes.find(t => t.id === task.type);
                const Icon = agentType?.icon || Bot;
                return (
                  <Card key={task.id} className="bg-card border-green-500/20" data-testid={`card-agent-${task.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-xl bg-green-500/10">
                          <Icon className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{task.name}</h3>
                            <Badge className="bg-green-500/20 text-green-400">Running</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{agentType?.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={task.progress || 0} className="w-32 h-2" />
                            <span className="text-xs text-muted-foreground">{task.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={task.isActive || false}
                          onCheckedChange={() => toggleTask.mutate(task.id)}
                          data-testid={`switch-agent-${task.id}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {inactiveTasks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-muted-foreground">Paused Agents</h3>
              {inactiveTasks.map((task) => {
                const agentType = agentTypes.find(t => t.id === task.type);
                const Icon = agentType?.icon || Bot;
                return (
                  <Card key={task.id} className="bg-card/50" data-testid={`card-agent-${task.id}`}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-3 rounded-xl bg-muted">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate text-muted-foreground">{task.name}</h3>
                            <Badge variant="outline">Paused</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{agentType?.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={task.isActive || false}
                        onCheckedChange={() => toggleTask.mutate(task.id)}
                        data-testid={`switch-agent-${task.id}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
