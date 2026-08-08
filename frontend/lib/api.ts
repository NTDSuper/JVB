import axios from "axios";
import { logout, getToken, setToken } from "@/lib/auth";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


const refreshApi = axios.create({
  baseURL:"/api",
  withCredentials: true,
});



api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


let isRefreshing = false;
let queue: ((token: string) => void)[] = [];

function processQueue(token: string) {
  queue.forEach((cb) => cb(token));
  queue = [];
}


api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (!originalRequest) return Promise.reject(err);

    if (originalRequest._retry) {
      return Promise.reject(err);
    }

    if (err.response?.status !== 401) {
      return Promise.reject(err);
    }

    if (originalRequest.url?.includes("/token/refresh")) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    // nếu đang refresh → queue request
    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const res = await refreshApi.post("/token/refresh");
      const newToken = res.data.access_token;

      setToken(newToken);

      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      isRefreshing = false;

      processQueue(newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (e) {
      isRefreshing = false;
      queue = [];

      logout(); // clear auth state
      return Promise.reject(e);
    }
  }
);

export default api;