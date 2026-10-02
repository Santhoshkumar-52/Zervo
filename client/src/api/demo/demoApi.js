import api from "../axios";

export const Demo = () => {
  return api.get("/demo");
};
