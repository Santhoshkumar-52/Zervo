import { useAlertStore } from "@/store/alert";
import { useSettingsStore } from "@/store/setting";

const canNotify = () => {
  return useSettingsStore.getState().notificationsEnabled;
};

// options: { title?: string, duration?: number (ms, 0 = persistent) }
const notify = (type, message, options = {}) => {
  if (!canNotify()) return;

  useAlertStore.getState().addAlert({ type, message, ...options });
};

export const notifySuccess = (message, options) =>
  notify("success", message, options);

export const notifyError = (message, options) =>
  notify("error", message, options);

export const notifyInfo = (message, options) =>
  notify("info", message, options);

export const notifyWarning = (message, options) =>
  notify("warning", message, options);
