import { useState, useRef } from "react";
import { useLeads, useDeleteLead } from "@/hooks/use-leads";
import { useScoreAllLeads, useStaleLeads } from "@/hooks/use-ai-features";
import { useBulkImportLeads, parseCSV } from "@/hooks/use-bulk-import";
import { LeadModal } from "@/components/LeadModal";
import { LeadDetailPanel } from "@/components/LeadDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, MoreVertical, Trash2, Edit, Brain, AlertTriangle, Eye, Upload, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lead } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Leads() {
  const { data: leads, isLoading } = useLeads();
  const deleteMutation = useDeleteLead();
  const scoreAllMutation = useScoreAllLeads();
  const importMutation = useBulkImportLeads();
  const { data: staleLeads } = useStaleLeads(14);
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsedLeads = parseCSV(text);
    
    if (parsedLeads.length === 0) {
      toast({
        title: "Import Failed",
        description: "No valid leads found in the file. Make sure it has 'name' and 'email' columns.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate(parsedLeads, {
      onSuccess: (result) => {
        toast({
          title: "Import Complete",
          description: result.message,
        });
        setIsImportOpen(false);
      },
      onError: () => {
        toast({
          title: "Import Failed",
          description: "Failed to import leads. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleExport = () => {
    if (!leads || leads.length === 0) {
      toast({ title: "No leads to export", variant: "destructive" });
      return;
    }
    window.open("/api/leads/export", "_blank");
  };

  const staleLeadIds = new Set(staleLeads?.map(s => s.leadId) || []);

  const filteredLeads = leads?.filter(lead => 
    lead.name.toLowerCase().includes(search.toLowerCase()) || 
    lead.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCreate = () => {
    setEditingLead(undefined);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'qualified': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'lost': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Manage and track your potential customers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setIsImportOpen(true)}
            className="gap-2"
            data-testid="button-import-leads"
          >
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="gap-2"
            data-testid="button-export-leads"
          >
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => scoreAllMutation.mutate()} 
            disabled={scoreAllMutation.isPending}
            className="gap-2"
            data-testid="button-score-all"
          >
            <Brain className="w-4 h-4" /> 
            {scoreAllMutation.isPending ? "Scoring..." : "AI Score All"}
          </Button>
          <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20" data-testid="button-add-lead">
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {staleLeads && staleLeads.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {staleLeads.length} lead{staleLeads.length > 1 ? 's' : ''} need attention - no activity in 14+ days
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search leads..." 
          className="border-none bg-transparent focus-visible:ring-0 shadow-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : filteredLeads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No leads found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads?.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className={`hover:bg-muted/50 border-border cursor-pointer ${staleLeadIds.has(lead.id) ? 'bg-destructive/5' : ''}`}
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {lead.name}
                      {staleLeadIds.has(lead.id) && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell>{lead.company || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={
                      (lead.score || 0) >= 70 ? "default" :
                      (lead.score || 0) >= 40 ? "secondary" : "outline"
                    }>
                      {lead.score || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.status || 'new')}`}>
                      {(lead.status || 'new').charAt(0).toUpperCase() + (lead.status || 'new').slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(lead); }} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} className="text-destructive cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LeadModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        lead={editingLead} 
      />

      {selectedLead && (
        <LeadDetailPanel 
          lead={selectedLead} 
          open={!!selectedLead} 
          onClose={() => setSelectedLead(undefined)} 
        />
      )}

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your leads. Required columns: name, email. 
              Optional: phone, company, title, source, status, notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-csv-file"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                data-testid="button-browse-file"
              >
                {importMutation.isPending ? "Importing..." : "Browse Files"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Example CSV format:</p>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
name,email,company,title,phone{"\n"}
John Doe,john@example.com,Acme Inc,CEO,555-1234
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
