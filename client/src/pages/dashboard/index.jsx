import { Demo } from "@/api/demo/demoApi";
import Title from "@/components/additonal/Title";
import { useEffect } from "react";

function Dashboard() {
  useEffect(() => {
    Demo();
  }, []);
  return (
    <Title/>
  );
}

export default Dashboard;
