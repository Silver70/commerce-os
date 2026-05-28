import axios from "redaxios"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})
