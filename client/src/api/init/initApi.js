import api from "../axios";

// GET /api/init
// Everything the client needs right after login, loaded together on the server.
// Response: { success, message, data: { branches: [{ id, name, code, ... }] } }
export const getInitData = () =>
  api.get("/init").then((res) => res.data.data);
