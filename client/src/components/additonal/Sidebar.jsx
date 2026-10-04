import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Percent,
  ReceiptText,
  Settings,
  UserCheck,
  UserCog,
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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuthStore } from "@/store/auth";

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
    title: "Staff",
    url: "/staff",
    icon: UserCog,
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

const setupNavigation = [
  {
    title: "Tax",
    url: "/tax",
    icon: ReceiptText,
  },
  {
    title: "Discount",
    url: "/discount",
    icon: Percent,
  },
  {
    title: "Plans",
    url: "/plans",
    icon: Dumbbell,
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

  const { logout } = useAuthStore.getState();

  const isActive = (url) => {
    if (url === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }

    return location.pathname.startsWith(url);
  };

  // Keep Setup active whenever one of its child pages is active
  const isSetupActive = setupNavigation.some((item) =>
    location.pathname.startsWith(item.url),
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      {/* HEADER */}
      <SidebarHeader className="border-b px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Zervo Gym"
              className="hover:bg-muted"
              render={<Link to="/dashboard" />}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="size-5" />
              </div>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Zervo Gym</span>

                <span className="truncate text-xs text-muted-foreground">
                  Management System
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="px-2 py-4">
        {/* MANAGEMENT */}
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

        {/* SETUP */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Setup
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      isActive={isSetupActive}
                      tooltip="Setup"
                      className="h-10 px-3 cursor-pointer"
                    >
                      <Settings className="size-4" />

                      <span className="flex-1 text-left">Setup</span>

                      <ChevronDown className="size-4 shrink-0 transition-transform" />
                    </SidebarMenuButton>
                  </PopoverTrigger>

                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-full p-1"
                  >
                    <div className="flex flex-col gap-1">
                      {setupNavigation.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.url);

                        return (
                          <Link
                            key={item.title}
                            to={item.url}
                            className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors ${
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            <Icon className="size-4" />

                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* SYSTEM */}
        <SidebarGroup className="mt-2">
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

      {/* FOOTER */}
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Logout"
              className="h-10 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                logout();
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
