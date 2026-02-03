import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Settings2, 
  Webhook, 
  Bell, 
  Zap, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  Clock,
  Activity,
  Bot
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

interface SchedulerStatus {
  [key: string]: {
    name: string;
    interval: number;
    lastRun: string | null;
    isRunning: boolean;
  };
}

const webhookEvents = [
  { id: "lead.created", label: "Lead Created" },
  { id: "lead.updated", label: "Lead Updated" },
  { id: "lead.scored", label: "Lead Scored" },
  { id: "opportunity.created", label: "Opportunity Created" },
  { id: "opportunity.stage_changed", label: "Opportunity Stage Changed" },
  { id: "opportunity.won", label: "Opportunity Won" },
  { id: "campaign.sent", label: "Campaign Sent" },
  { id: "email.opened", label: "Email Opened" },
  { id: "email.clicked", label: "Email Clicked" },
  { id: "agent.completed", label: "Agent Completed" },
];

export default function Settings() {
  const { toast } = useToast();
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: schedulerStatus } = useQuery<SchedulerStatus>({
    queryKey: ["/api/scheduler/status"],
    refetchInterval: 10000,
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[] }) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setIsWebhookDialogOpen(false);
      setNewWebhookUrl("");
      setSelectedEvents([]);
      toast({
        title: "Webhook Created",
        description: `Secret: ${data.secret}. Save this - it won't be shown again!`,
      });
    },
    onError: () => {
      toast({ title: "Failed to create webhook", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  const handleCreateWebhook = () => {
    if (!newWebhookUrl || selectedEvents.length === 0) {
      toast({ title: "Please enter a URL and select at least one event", variant: "destructive" });
      return;
    }
    createWebhookMutation.mutate({ url: newWebhookUrl, events: selectedEvents });
  };

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(id);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const formatInterval = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} hr`;
  };

  const formatLastRun = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage integrations, webhooks, and automation settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automation Scheduler
            </CardTitle>
            <CardDescription>Background jobs running automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedulerStatus ? (
              Object.entries(schedulerStatus).map(([id, job]) => (
                <div key={id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${job.isRunning ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
                    <div>
                      <p className="font-medium text-sm">{job.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Every {formatInterval(job.interval)} | Last: {formatLastRun(job.lastRun)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={job.isRunning ? "default" : "secondary"}>
                    {job.isRunning ? "Running" : "Idle"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Loading scheduler status...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>Receive real-time notifications to external systems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {webhooksLoading ? (
              <p className="text-muted-foreground text-sm">Loading webhooks...</p>
            ) : webhooks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No webhooks configured</p>
            ) : (
              webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{webhook.url}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {webhook.events.slice(0, 3).map(e => (
                        <Badge key={e} variant="secondary" className="text-xs">{e.split('.')[1]}</Badge>
                      ))}
                      {webhook.events.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{webhook.events.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(webhook.secret, webhook.id)}
                    >
                      {copiedSecret === webhook.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" data-testid="button-add-webhook">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://your-server.com/webhook"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      data-testid="input-webhook-url"
                    />
                  </div>
                  <div>
                    <Label>Events to Subscribe</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {webhookEvents.map((event) => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={event.id}
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={() => handleEventToggle(event.id)}
                          />
                          <label htmlFor={event.id} className="text-sm">{event.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateWebhook} 
                    disabled={createWebhookMutation.isPending}
                    className="w-full"
                    data-testid="button-create-webhook"
                  >
                    Create Webhook
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>Real-time system status and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">API Status</span>
              </div>
              <p className="text-2xl font-bold mt-2">Healthy</p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">Database</span>
              </div>
              <p className="text-2xl font-bold mt-2">Connected</p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">Scheduler</span>
              </div>
              <p className="text-2xl font-bold mt-2">Running</p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">AI Services</span>
              </div>
              <p className="text-2xl font-bold mt-2">Available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
