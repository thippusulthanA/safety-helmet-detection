import axios from "axios";
import {
  HealthResponse,
  ImageDetectionResponse,
  VideoDetectionResponse,
  PaginatedLogsResponse,
  StatsResponse,
} from "./types";

const API_ROOT = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_ROOT ? `${API_ROOT}/api` : "/api",
  timeout: 60000,
});

export const getHealth = async (): Promise<HealthResponse> => {
  const res = await api.get<HealthResponse>("/health");
  return res.data;
};

export const detectImage = async (
  file: File,
  conf: number = 0.25,
  iou: number = 0.70
): Promise<ImageDetectionResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conf", conf.toString());
  formData.append("iou", iou.toString());

  const res = await api.post<ImageDetectionResponse>("/detect/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const submitVideo = async (
  file: File,
  conf: number = 0.25,
  iou: number = 0.70
): Promise<VideoDetectionResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conf", conf.toString());
  formData.append("iou", iou.toString());

  const res = await api.post<VideoDetectionResponse>("/detect/video", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const getVideoStatus = async (jobId: string): Promise<VideoDetectionResponse> => {
  const res = await api.get<VideoDetectionResponse>(`/detect/video/${jobId}`);
  return res.data;
};

export const getLogs = async (
  page: number = 1,
  limit: number = 10,
  sourceType?: string,
  startDate?: string,
  endDate?: string
): Promise<PaginatedLogsResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (sourceType) params.source_type = sourceType;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const res = await api.get<PaginatedLogsResponse>("/logs", { params });
  return res.data;
};

export const clearLogs = async (): Promise<{ message: string }> => {
  const res = await api.delete<{ message: string }>("/logs");
  return res.data;
};

export const getExportCsvUrl = (
  sourceType?: string,
  startDate?: string,
  endDate?: string
): string => {
  const params = new URLSearchParams();
  if (sourceType) params.append("source_type", sourceType);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const query = params.toString();
  return `/api/logs/export${query ? `?${query}` : ""}`;
};

export const getStats = async (): Promise<StatsResponse> => {
  const res = await api.get<StatsResponse>("/stats");
  return res.data;
};

