import api from "../axios";

export const login = (email, password) => {
  return api.post("/auth/login", {
    email,
    password,
  });
};

export const register = (fullName, email, password, role, branchId) => {
  return api.post("/auth/register", {
    fullName,
    email,
    password,
    role,
    branchId,
  });
};

export const refreshToken = (refreshToken) => {
  return api.post(
    "/auth/refresh",
    {},
    {
      headers: {
        "x-refresh-token": refreshToken,
      },
    },
  );
};
