import { useClients } from "@/hooks/use-clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Users, DollarSign, Activity } from "lucide-react";

export default function CustomerSuccess() {
  const { data: clients, isLoading } = useClients();

  const healthyClients = clients?.filter(c => (c.healthScore || 0) >= 70) || [];
  const atRiskClients = clients?.filter(c => (c.healthScore || 0) >= 40 && (c.healthScore || 0) < 70) || [];
  const criticalClients = clients?.filter(c => (c.healthScore || 0) < 40) || [];
  const totalLTV = clients?.reduce((acc, c) => acc + (c.lifetimeValue || 0), 0) || 0;
  const avgHealth = clients?.length ? Math.round(clients.reduce((acc, c) => acc + (c.healthScore || 0), 0) / clients.length) : 0;

  const getHealthColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold tracking-tight">Customer Success</h2>
        <p className="text-muted-foreground">Monitor client health and ensure customer success.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Health Score</p>
                <p className={`text-2xl font-bold ${getHealthColor(avgHealth)}`}>{avgHealth}%</p>
              </div>
              <Heart className={`w-8 h-8 ${getHealthColor(avgHealth)}/50`} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-yellow-500">{atRiskClients.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total LTV</p>
                <p className="text-2xl font-bold">${totalLTV.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-green-500/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <CardTitle className="text-lg">Healthy Clients ({healthyClients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthyClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No healthy clients yet</p>
            ) : (
              healthyClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={client.healthScore || 0} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-green-500 w-10">{client.healthScore}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-yellow-500/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-lg">At Risk ({atRiskClients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRiskClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No at-risk clients</p>
            ) : (
              atRiskClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={client.healthScore || 0} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-yellow-500 w-10">{client.healthScore}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-red-500/20">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <CardTitle className="text-lg">Critical ({criticalClients.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No critical clients</p>
            ) : (
              criticalClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={client.healthScore || 0} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-red-500 w-10">{client.healthScore}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Client Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-muted/20 rounded-lg" />
          ) : clients?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Add clients to see health metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients?.map((client) => (
                <div key={client.id} className="flex items-center gap-4">
                  <div className="w-40 truncate">
                    <p className="font-medium truncate">{client.name}</p>
                  </div>
                  <div className="flex-1">
                    <div className="relative h-6 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 ${getHealthBg(client.healthScore || 0)} transition-all duration-500`}
                        style={{ width: `${client.healthScore || 0}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white mix-blend-difference">{client.healthScore}%</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={client.status === "active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}>
                    {client.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
