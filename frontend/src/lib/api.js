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
  pix: (data) => api.post("/checkout/pix", data),
  pixInfo: () => api.get("/pix-info"),
  status: (sessionId) => api.get(`/checkout/status/${sessionId}`),
};

export const adminPixAPI = {
  confirm: (transactionId) => api.post("/admin/confirm-pix", { transaction_id: transactionId }),
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

export const showcaseAPI = {
  getAll: () => api.get("/showcase"),
  add: (data) => api.post("/showcase", data),
  delete: (id) => api.delete(`/showcase/${id}`),
};

export const uploadAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const bioAPI = {
  get: () => api.get("/bio"),
  update: (data) => api.put("/bio", data),
};

export const adminAPI = {
  stats: () => api.get("/admin/stats"),
  balance: () => api.get("/admin/balance"),
  withdraw: (data) => api.post("/admin/withdraw", data),
};

export const recordingsAPI = {
  getAll: () => api.get("/recordings"),
  upload: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/recordings/upload", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 300000 });
  },
  create: (data) => api.post("/recordings", data),
  toggleVisibility: (id, isPublic) => api.put(`/recordings/${id}/visibility`, { is_public: isPublic }),
  delete: (id) => api.delete(`/recordings/${id}`),
  streamUrl: (id) => `${BACKEND_URL}/api/recordings/${id}/stream`,
};

export const siteSettingsAPI = {
  get: () => api.get("/site-settings"),
  update: (data) => api.put("/site-settings", data),
};

export const userAPI = {
  orders: () => api.get("/user/orders"),
};

export default api;
