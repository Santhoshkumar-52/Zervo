import { toast } from "react-toastify";
import { useSettingsStore } from "@/store/setting";

const canNotify = () => {
  return useSettingsStore.getState().notificationsEnabled;
};

export const notifySuccess = (message) => {
  if (!canNotify()) return;

  toast.success(message);
};

export const notifyError = (message) => {
  if (!canNotify()) return;

  toast.error(message);
};

export const notifyInfo = (message) => {
  if (!canNotify()) return;

  toast.info(message);
};

export const notifyWarning = (message) => {
  if (!canNotify()) return;

  toast.warning(message);
};
