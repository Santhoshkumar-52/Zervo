import { create } from "zustand";

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: ({ accessToken, refreshToken, user }) => {
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
    });
  },
  getAuth: () => {
    return get();
  },

  logout: () => {
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));
