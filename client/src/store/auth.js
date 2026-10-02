import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      // Login/register loading state
      isLoading: false,

      setLoading: (isLoading) => {
        set({
          isLoading,
        });
      },

      setAuth: ({ accessToken, refreshToken, user }) => {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      updateAccessToken: (accessToken) => {
        set({
          accessToken,
          isAuthenticated: true,
          isLoading: false,
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
          isLoading: false,
        });
      },
    }),
    {
      name: "zervo-auth",
    },
  ),
);
