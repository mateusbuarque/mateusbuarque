import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (data) => api.post("/auth/register", data),
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

export const productAPI = {
  getAll: () => api.get("/products"),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const checkoutAPI = {
  campaign: (data) => api.post("/checkout/campaign", { ...data, origin_url: window.location.origin }),
  product: (data) => api.post("/checkout/product", { ...data, origin_url: window.location.origin }),
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

export const siteSettingsAPI = {
  get: () => api.get("/site-settings"),
  update: (data) => api.put("/site-settings", data),
};

export const userAPI = {
  orders: () => api.get("/user/orders"),
};

export default api;
