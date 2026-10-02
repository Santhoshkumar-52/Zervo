import axios from "axios";
import { useAuthStore } from "../store/auth";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --------------------------------------------------
// Refresh state
// --------------------------------------------------

let isRefreshing = false;

let refreshSubscribers = [];

// --------------------------------------------------
// Add request to waiting queue
// --------------------------------------------------

const subscribeToRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// --------------------------------------------------
// Notify all waiting requests that refresh succeeded
// --------------------------------------------------

const onRefreshSuccess = (accessToken) => {
  refreshSubscribers.forEach((callback) => {
    callback(null, accessToken);
  });

  refreshSubscribers = [];
};

// --------------------------------------------------
// Notify all waiting requests that refresh failed
// --------------------------------------------------

const onRefreshFailure = (error) => {
  refreshSubscribers.forEach((callback) => {
    callback(error, null);
  });

  refreshSubscribers = [];
};

// --------------------------------------------------
// Request interceptor
// --------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// --------------------------------------------------
// Response interceptor
// --------------------------------------------------

api.interceptors.response.use(
  // Successful response
  (response) => {
    return response;
  },

  // Failed response
  async (error) => {
    const originalRequest = error.config;

    // ------------------------------------------------
    // No server response
    // ------------------------------------------------

    if (!error.response) {
      return Promise.reject(error);
    }

    const statusCode = error.response.status;

    // ------------------------------------------------
    // Only handle unauthorized requests
    // ------------------------------------------------

    if (statusCode !== 401) {
      return Promise.reject(error);
    }

    // ------------------------------------------------
    // A wrong password on login is a 401 too.
    // That is not an expired token, so never refresh for it
    // ------------------------------------------------

    if (originalRequest?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Safety check
    // Never try to refresh the refresh request itself
    // ------------------------------------------------

    if (originalRequest?.url?.includes("/auth/refresh")) {
      useAuthStore.getState().logout();

      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Prevent infinite retry loop
    // ------------------------------------------------

    if (originalRequest?._retry) {
      useAuthStore.getState().logout();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // ------------------------------------------------
    // Get refresh token from Zustand
    // ------------------------------------------------

    const { refreshToken } = useAuthStore.getState();

    // ------------------------------------------------
    // No refresh token
    // ------------------------------------------------

    if (!refreshToken) {
      useAuthStore.getState().logout();

      return Promise.reject(error);
    }

    // ------------------------------------------------
    // Another request is already refreshing
    // ------------------------------------------------

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeToRefresh((refreshError, newAccessToken) => {
          if (refreshError) {
            reject(refreshError);
            return;
          }

          if (!newAccessToken) {
            reject(error);
            return;
          }

          // Attach new token
          originalRequest.headers = originalRequest.headers || {};

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Retry original request
          resolve(api(originalRequest));
        });
      });
    }

    // ------------------------------------------------
    // Start refresh process
    // ------------------------------------------------

    isRefreshing = true;

    try {
      // Import here to avoid circular dependency:
      // axios.js -> authApi.js -> axios.js
      const { refreshToken: refreshTokenRequest } = await import("./auth/authApi");

      // ------------------------------------------------
      // Call refresh endpoint
      // ------------------------------------------------

      const response = await refreshTokenRequest(refreshToken);

      const data = response.data?.data;

      // ------------------------------------------------
      // Validate refresh response
      // ------------------------------------------------

      if (!data?.accessToken) {
        throw new Error("Refresh response did not contain an access token");
      }

      const newAccessToken = data.accessToken;

      const newRefreshToken = data.refreshToken || refreshToken;

      const currentUser = data.user || useAuthStore.getState().user;

      // ------------------------------------------------
      // Update Zustand
      // ------------------------------------------------

      useAuthStore.getState().setAuth({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: currentUser,
      });

      // ------------------------------------------------
      // Notify waiting requests
      // ------------------------------------------------

      onRefreshSuccess(newAccessToken);

      // ------------------------------------------------
      // Attach new token to original request
      // ------------------------------------------------

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // ------------------------------------------------
      // Retry original request
      // ------------------------------------------------

      return api(originalRequest);
    } catch (refreshError) {
      // ------------------------------------------------
      // Refresh failed
      // ------------------------------------------------

      onRefreshFailure(refreshError);

      // ------------------------------------------------
      // Clear authentication
      // ------------------------------------------------

      useAuthStore.getState().logout();

      // ------------------------------------------------
      // Reject original request
      // ------------------------------------------------

      return Promise.reject(refreshError);
    } finally {
      // ------------------------------------------------
      // Allow another refresh in the future
      // ------------------------------------------------

      isRefreshing = false;
    }
  },
);

export default api;
