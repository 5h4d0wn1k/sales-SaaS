import { useState } from "react";
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from "@/hooks/use-campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Mail, Send, Eye, MousePointer, MessageSquare, Trash2, Edit, Play, Pause, BarChart3 } from "lucide-react";
import type { Campaign, InsertCampaign } from "@shared/schema";

export default function Campaigns() {
  const { data: campaigns, isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState<InsertCampaign>({
    userId: "",
    name: "",
    type: "email",
    status: "draft",
    subject: "",
    content: "",
    targetAudience: "all_leads",
  });

  const resetForm = () => {
    setFormData({ userId: "", name: "", type: "email", status: "draft", subject: "", content: "", targetAudience: "all_leads" });
    setEditingCampaign(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCampaign) {
      await updateCampaign.mutateAsync({ id: editingCampaign.id, ...formData });
    } else {
      await createCampaign.mutateAsync(formData);
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      userId: campaign.userId,
      name: campaign.name,
      type: campaign.type || "email",
      status: campaign.status || "draft",
      subject: campaign.subject || "",
      content: campaign.content || "",
      targetAudience: campaign.targetAudience || "all_leads",
    });
    setIsOpen(true);
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await updateCampaign.mutateAsync({ id: campaign.id, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return styles[status] || styles.draft;
  };

  const totalSent = campaigns?.reduce((acc, c) => acc + (c.sentCount || 0), 0) || 0;
  const totalOpened = campaigns?.reduce((acc, c) => acc + (c.openCount || 0), 0) || 0;
  const totalClicked = campaigns?.reduce((acc, c) => acc + (c.clickCount || 0), 0) || 0;
  const totalReplies = campaigns?.reduce((acc, c) => acc + (c.replyCount || 0), 0) || 0;
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Email Campaigns</h2>
          <p className="text-muted-foreground">Create and manage automated outreach campaigns.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input data-testid="input-campaign-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type || "email"} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger data-testid="select-campaign-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="multi-channel">Multi-Channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formData.targetAudience || "all_leads"} onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}>
                  <SelectTrigger data-testid="select-campaign-audience"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_leads">All Leads</SelectItem>
                    <SelectItem value="new_leads">New Leads Only</SelectItem>
                    <SelectItem value="qualified">Qualified Leads</SelectItem>
                    <SelectItem value="cold">Cold Leads</SelectItem>
                    <SelectItem value="linkedin">LinkedIn Leads</SelectItem>
                    <SelectItem value="instagram">Instagram Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input data-testid="input-campaign-subject" value={formData.subject || ""} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g., Quick question about your business" />
              </div>
              <div className="space-y-2">
                <Label>Email Content</Label>
                <Textarea
                  data-testid="input-campaign-content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Hi {{name}},&#10;&#10;I noticed your company {{company}} is doing great things in {{industry}}..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">Use variables like {"{{name}}"}, {"{{company}}"}, {"{{industry}}"} for personalization.</p>
              </div>
              <Button type="submit" className="w-full" data-testid="button-save-campaign">
                {editingCampaign ? "Update Campaign" : "Create Campaign"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
              </div>
              <Send className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{openRate}%</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clicks</p>
                <p className="text-2xl font-bold">{totalClicked.toLocaleString()}</p>
              </div>
              <MousePointer className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Replies</p>
                <p className="text-2xl font-bold">{totalReplies.toLocaleString()}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-card/50">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : campaigns?.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No campaigns yet. Create your first campaign to start outreach.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="bg-card" data-testid={`card-campaign-${campaign.id}`}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{campaign.name}</h3>
                      <Badge className={getStatusBadge(campaign.status || "draft")}>{campaign.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{campaign.subject || "No subject"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Send className="w-4 h-4" />
                      <span>{campaign.sentCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{campaign.openCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="w-4 h-4" />
                      <span>{campaign.clickCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleCampaignStatus(campaign)} data-testid={`button-toggle-campaign-${campaign.id}`}>
                      {campaign.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(campaign)} data-testid={`button-edit-campaign-${campaign.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCampaign.mutate(campaign.id)} data-testid={`button-delete-campaign-${campaign.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
