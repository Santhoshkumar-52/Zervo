import { Demo } from "@/api/demo/demoApi";
import { useEffect } from "react";

function Dashboard() {
  useEffect(() => {
    Demo();
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <p className="mt-2 text-muted-foreground">
        Welcome to the gym management system.
      </p>
    </div>
  );
}

export default Dashboard;
