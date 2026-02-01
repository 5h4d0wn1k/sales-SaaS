import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Bot, 
  CreditCard, 
  LogOut,
  UserCircle,
  Building2,
  Mail,
  Heart
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Leads", href: "/leads" },
    { icon: Target, label: "Opportunities", href: "/opportunities" },
    { icon: Building2, label: "Clients", href: "/clients" },
  ];

  const toolsNavItems = [
    { icon: Mail, label: "Campaigns", href: "/campaigns" },
    { icon: Bot, label: "Agentic Mode", href: "/agentic-mode" },
    { icon: Heart, label: "Customer Success", href: "/customer-success" },
  ];

  const settingsNavItems = [
    { icon: CreditCard, label: "Subscription", href: "/subscription" },
  ];

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border/40 bg-card/50">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Bot className="w-5 h-5" />
              </div>
              <h1 className="font-display font-bold text-xl tracking-tight text-white">
                Sales<span className="text-primary">Genetics</span>
              </h1>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton 
                          isActive={location === item.href}
                          className="w-full justify-start gap-3 h-10 transition-all duration-200"
                          data-testid={`nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className={`w-4 h-4 ${location === item.href ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={location === item.href ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toolsNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton 
                          isActive={location === item.href}
                          className="w-full justify-start gap-3 h-10 transition-all duration-200"
                          data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                        >
                          <item.icon className={`w-4 h-4 ${location === item.href ? "text-accent" : "text-muted-foreground"}`} />
                          <span className={location === item.href ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {settingsNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton 
                          isActive={location === item.href}
                          className="w-full justify-start gap-3 h-10 transition-all duration-200"
                          data-testid={`nav-${item.label.toLowerCase()}`}
                        >
                          <item.icon className={`w-4 h-4 ${location === item.href ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={location === item.href ? "font-medium text-foreground" : "text-muted-foreground"}>
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border/40">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="User" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <UserCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName || user?.email?.split('@')[0] || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
