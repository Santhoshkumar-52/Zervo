
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const mainNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    url: "/members",
    icon: Users,
  },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: Dumbbell,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCard,
  },
  {
    title: "Attendance",
    url: "/attendance",
    icon: UserCheck,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
];

const settingsNavigation = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export default function AppSidebar() {
  const location = useLocation();

  const isActive = (url) => {
    if (url === "/dashboard") {
      return (
        location.pathname === "/" ||
        location.pathname === "/dashboard"
      );
    }

    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r"
    >
      {/* ------------------------------------------------
          HEADER
      ------------------------------------------------ */}
      <SidebarHeader className="border-b px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Zervo Gym"
              className="hover:bg-muted"
              render={<Link to="/dashboard" />}
            >
                {/* Logo */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Dumbbell className="size-5" />
                </div>

                {/* Brand */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Zervo Gym
                  </span>

                  <span className="truncate text-xs text-muted-foreground">
                    Management System
                  </span>
                </div>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ------------------------------------------------
          CONTENT
      ------------------------------------------------ */}
      <SidebarContent className="px-2 py-4">
        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Management
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 px-3"
                      render={<Link to={item.url} />}
                    >
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            System
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {settingsNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 px-3"
                      render={<Link to={item.url} />}
                    >
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ------------------------------------------------
          FOOTER
      ------------------------------------------------ */}
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Logout"
              className="h-10 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                // TODO:
                // 1. Clear Zustand auth state
                // 2. Call logout API
                // 3. Navigate to /login

                console.log("Logout");
              }}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

