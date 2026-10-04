import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "@/layouts/PublicLayout";
import ProtectedLayout from "@/layouts/ProtectedLayout";
import AppLayout from "@/pages/AppLayout";

import Login from "@/pages/public/Login";
import Dashboard from "@/pages/dashboard/index";
import Members from "@/pages/members/index";
import Staff from "@/pages/staff/index";
import Subscriptions from "@/pages/subscriptions/index";
import Payments from "@/pages/payments/index";
import Attendance from "@/pages/attendance/index";
import Reports from "@/pages/reports/index";
import Setting from "@/pages/settings/index";
import NotFound from "@/pages/public/NotFound";
import Offline from "@/pages/public/Offline";
import { useEffect, useState } from "react";
import Tax from "@/pages/tax";
import Plans from "@/pages/plans";
import Discount from "@/pages/discount";

function AppRoutes() {
  // for offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  if (!isOnline) {
    return <Offline />;
  }
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedLayout />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Setting />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/tax" element={<Tax />} />
            <Route path="/discount" element={<Discount />} />
          </Route>
        </Route>

        {/* Default route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
