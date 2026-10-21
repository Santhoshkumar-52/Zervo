import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/additonal/Sidebar";
import ThemeSwitcher from "@/components/additonal/ThemeSwitcher";
import BranchBrand from "@/components/additonal/BranchBrand";
import Spinner from "@/components/additonal/Spinner";

import { useAuthStore } from "@/store/auth";
import { useInitStore } from "@/store/init";
import { notifyError } from "@/utils/notification";

// Smooth scrolling for the app shell (window scroll only).
// - allowNestedScroll: tables, sidebar, charts and popup lists keep native scrolling
// - syncTouch off: touch devices keep their own momentum scrolling
// - reduced-motion preference is respected by Lenis by default
const LENIS_OPTIONS = {
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: false,
  allowNestedScroll: true,
  anchors: false,
};

// Start each page at the top after a route change (no ScrollRestoration in this app).
function ScrollToTop() {
  const { pathname } = useLocation();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

// Clear, user-facing message for a failed init load.
const getInitErrorMessage = (error) => {
  // No response at all: server down or no internet
  if (!error?.response) {
    return "We couldn't reach the server to load your data. Please check your connection and sign in again.";
  }

  const status = error.response.status;

  if (status === 401 || status === 403) {
    return "Your session couldn't be verified. Please sign in again.";
  }

  return "We signed you in but couldn't load your workspace data. Please try signing in again.";
};

export default function AppLayout() {
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);

  const hasLoaded = useInitStore((state) => state.hasLoaded);
  const fetchInit = useInitStore((state) => state.fetchInit);
  const resetInit = useInitStore((state) => state.reset);

  // Load the init data once when the app shell mounts (after login, or after
  // a page refresh with a saved session).
  useEffect(() => {
    if (hasLoaded) return;

    const loadInit = async () => {
      try {
        await fetchInit();
      } catch (initError) {
        console.error("Init load error:", initError);

        // Don't keep a half-finished session: clear it and go back to login
        logout();
        resetInit();

        const initMessage = getInitErrorMessage(initError);

        notifyError(initMessage);

        // Login shows this message under the form
        navigate("/login", {
          replace: true,
          state: { errorMessage: initMessage },
        });
      }
    };

    loadInit();
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the spinner until the init data is ready
  if (!hasLoaded) {
    return <Spinner message="Loading your workspace..." />;
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <ScrollToTop />
      <SidebarProvider>
        {/* Sidebar */}
        <AppSidebar />

        {/* Main area */}
        <SidebarInset className="min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />

            <div className="h-5 w-px bg-border" />

            {/* Branch logo + name */}
            <BranchBrand subtitle="Management System" />

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
    </ReactLenis>
  );
}
