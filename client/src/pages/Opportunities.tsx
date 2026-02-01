import { useState } from "react";
import { useOpportunities, useDeleteOpportunity } from "@/hooks/use-opportunities";
import { OpportunityModal } from "@/components/OpportunityModal";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, DollarSign } from "lucide-react";
import { Opportunity } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Opportunities() {
  const { data: opportunities, isLoading } = useOpportunities();
  const deleteMutation = useDeleteOpportunity();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | undefined>(undefined);

  const stages = [
    { id: "prospecting", label: "Prospecting", color: "bg-blue-500" },
    { id: "negotiation", label: "Negotiation", color: "bg-yellow-500" },
    { id: "closed-won", label: "Closed Won", color: "bg-green-500" },
    { id: "closed-lost", label: "Closed Lost", color: "bg-red-500" },
  ];

  const handleCreate = () => {
    setEditingOpp(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (opp: Opportunity) => {
    setEditingOpp(opp);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this opportunity?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">Track your deals through the sales process.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> New Opportunity
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {stages.map((stage) => {
            const stageOpps = opportunities?.filter(o => o.stage === stage.id) || [];
            const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.value || 0), 0);

            return (
              <div key={stage.id} className="flex-1 min-w-[280px] flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="font-medium text-sm">{stage.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {stageOpps.length}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    ${stageValue.toLocaleString()}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {stageOpps.map((opp) => (
                    <div 
                      key={opp.id} 
                      className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => handleEdit(opp)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm leading-tight">{opp.title}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(opp.id); }}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-muted-foreground text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {(opp.value || 0).toLocaleString()}
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-muted font-medium text-muted-foreground">
                          {opp.probability}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageOpps.length === 0 && (
                    <div className="h-24 border border-dashed border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <OpportunityModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        opportunity={editingOpp} 
      />
    </div>
  );
}
