import { useState } from "react";
import { useLeadActivities, useCreateLeadActivity } from "@/hooks/use-lead-activities";
import { useScoreLead, useGenerateContent } from "@/hooks/use-ai-features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, Mail, Phone, MessageSquare, Calendar, FileText, 
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, Copy, Check
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

interface LeadDetailPanelProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

export function LeadDetailPanel({ lead, open, onClose }: LeadDetailPanelProps) {
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(lead?.id);
  const createActivity = useCreateLeadActivity();
  const scoreMutation = useScoreLead();
  const generateMutation = useGenerateContent();
  
  const [activityType, setActivityType] = useState("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleAddActivity = async () => {
    if (!activityTitle) return;
    await createActivity.mutateAsync({
      leadId: lead.id,
      activity: { type: activityType, title: activityTitle, description: activityDesc }
    });
    setActivityTitle("");
    setActivityDesc("");
  };

  const handleScoreLead = async () => {
    const result = await scoreMutation.mutateAsync(lead.id);
    setScoreResult(result);
  };

  const handleGenerateContent = async (type: string) => {
    const result = await generateMutation.mutateAsync({ leadId: lead.id, contentType: type });
    setGeneratedContent({ type, ...result });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activityIcons: Record<string, any> = {
    email: Mail, call: Phone, meeting: Calendar, note: MessageSquare, task: FileText
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.name}
            <Badge variant={lead.status === "qualified" ? "default" : "secondary"}>
              {lead.status}
            </Badge>
            <Badge variant="outline">Score: {lead.score || 0}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Timeline</TabsTrigger>
            <TabsTrigger value="ai-score">AI Scoring</TabsTrigger>
            <TabsTrigger value="ai-content">AI Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{lead.company || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{lead.title || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{lead.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{lead.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{lead.source}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Contact</p>
                <p className="font-medium">
                  {lead.lastContactedAt ? format(new Date(lead.lastContactedAt), "PPP") : "Never"}
                </p>
              </div>
            </div>
            {lead.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-1">{lead.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Add Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Activity title" 
                    value={activityTitle} 
                    onChange={(e) => setActivityTitle(e.target.value)} 
                  />
                </div>
                <Textarea 
                  placeholder="Details (optional)" 
                  value={activityDesc} 
                  onChange={(e) => setActivityDesc(e.target.value)}
                  rows={2}
                />
                <Button onClick={handleAddActivity} disabled={!activityTitle || createActivity.isPending} size="sm">
                  Add Activity
                </Button>
              </CardContent>
            </Card>

            <ScrollArea className="h-64">
              <div className="space-y-3">
                {activitiesLoading ? (
                  <p className="text-muted-foreground text-center py-4">Loading...</p>
                ) : activities?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No activities yet</p>
                ) : (
                  activities?.map((activity) => {
                    const Icon = activityIcons[activity.type] || MessageSquare;
                    return (
                      <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm">{activity.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {activity.createdAt && format(new Date(activity.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai-score" className="space-y-4">
            <Button onClick={handleScoreLead} disabled={scoreMutation.isPending}>
              <Brain className="h-4 w-4 mr-2" />
              {scoreMutation.isPending ? "Analyzing..." : "Analyze Lead with AI"}
            </Button>

            {scoreResult && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>AI Lead Score</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold">{scoreResult.score}</span>
                      <Badge variant={
                        scoreResult.riskLevel === "low" ? "default" :
                        scoreResult.riskLevel === "medium" ? "secondary" : "destructive"
                      }>
                        {scoreResult.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Scoring Factors</p>
                    <div className="space-y-2">
                      {scoreResult.factors.map((factor: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {factor.impact > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : factor.impact < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{factor.name}</span>
                          <span className={factor.impact > 0 ? "text-green-500" : factor.impact < 0 ? "text-red-500" : ""}>
                            ({factor.impact > 0 ? "+" : ""}{factor.impact})
                          </span>
                          <span className="text-muted-foreground">- {factor.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium">Recommendation</p>
                    <p className="text-sm text-muted-foreground">{scoreResult.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai-content" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleGenerateContent("cold_email")} disabled={generateMutation.isPending} size="sm">
                <Sparkles className="h-4 w-4 mr-2" /> Cold Email
              </Button>
              <Button onClick={() => handleGenerateContent("follow_up")} disabled={generateMutation.isPending} size="sm" variant="outline">
                Follow-up
              </Button>
              <Button onClick={() => handleGenerateContent("proposal")} disabled={generateMutation.isPending} size="sm" variant="outline">
                Proposal
              </Button>
              <Button onClick={() => handleGenerateContent("meeting_prep")} disabled={generateMutation.isPending} size="sm" variant="outline">
                Meeting Prep
              </Button>
            </div>

            {generateMutation.isPending && (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 animate-pulse mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Generating personalized content...</p>
              </div>
            )}

            {generatedContent && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Generated {generatedContent.type.replace("_", " ")}</CardTitle>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(generatedContent.emailBody)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Subject</p>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{generatedContent.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Body</p>
                    <div className="text-sm bg-muted p-3 rounded mt-1 whitespace-pre-wrap">
                      {generatedContent.emailBody}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Talking Points</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                      {generatedContent.talkingPoints.map((point: string, i: number) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
