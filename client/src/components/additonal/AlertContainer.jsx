import { useEffect, useRef, useState } from "react";
import { AppAlert } from "@/components/additonal/AppAlert";
import { useAlertStore } from "@/store/alert";

function AlertItem({ alert }) {
  const removeAlert = useAlertStore((state) => state.removeAlert);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(alert.duration);

  useEffect(() => {
    if (paused || !alert.duration) return;

    const startedAt = Date.now();
    const timer = setTimeout(() => removeAlert(alert.id), remainingRef.current);

    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [paused, alert.id, alert.duration, removeAlert]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="animate-in fade-in slide-in-from-right-4 duration-200"
    >
      <AppAlert
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => removeAlert(alert.id)}
      />
    </div>
  );
}

// Mount once at the app root (replaces <ToastContainer />).
export function AlertContainer() {
  const alerts = useAlertStore((state) => state.alerts);

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <AlertItem alert={alert} />
        </div>
      ))}
    </div>
  );
}
