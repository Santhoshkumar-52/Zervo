
import { Outlet } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/additonal/Sidebar";
import ThemeSwitcher from "@/components/additonal/ThemeSwitcher";



export default function AppLayout() {
  return (
    <SidebarProvider>
      {/* Sidebar */}
      <AppSidebar />

      {/* Main area */}
      <SidebarInset className="min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />

          <div className="h-5 w-px bg-border" />

          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              Zervo Gym
            </span>

            <span className="text-xs text-muted-foreground">
              Management System
            </span>
          </div>

          {/* Color + light/dark picker (sets class on <html>) */}
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

