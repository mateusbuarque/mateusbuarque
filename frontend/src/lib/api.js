import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

export const campaignAPI = {
  getAll: () => api.get("/campaigns"),
  getOne: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post("/campaigns", data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
};

export const checkoutAPI = {
  create: (data) => api.post("/checkout", { ...data, origin_url: window.location.origin }),
  status: (sessionId) => api.get(`/checkout/status/${sessionId}`),
};

export const newsletterAPI = {
  subscribe: (email) => api.post("/newsletter", { email }),
  getSubscribers: () => api.get("/newsletter/subscribers"),
};

export const galleryAPI = {
  getAll: () => api.get("/gallery"),
  add: (data) => api.post("/gallery", data),
  delete: (id) => api.delete(`/gallery/${id}`),
};

export const bioAPI = {
  get: () => api.get("/bio"),
  update: (data) => api.put("/bio", data),
};

export const adminAPI = {
  stats: () => api.get("/admin/stats"),
};

export default api;
