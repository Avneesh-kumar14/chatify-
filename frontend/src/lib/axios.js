import axios from "axios";

// Determine base URL based on environment
const getBaseURL = () => {
  if (import.meta.env.MODE === "development") {
    // Use relative path for API calls
    return "/api";
  }
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});
