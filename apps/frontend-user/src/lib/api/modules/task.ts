/**
 * 任务模块 API
 */

import { api } from '../client';
import type {
  Task,
  TaskLog,
  CreateTaskRequest,
  EstimateCostRequest,
  EstimateCostResponse,
  ListTasksParams,
  PaginatedResponse,
} from '../types';

export const taskApi = {
  /**
   * 创建任务
   */
  createTask: async (data: CreateTaskRequest): Promise<Task> => {
    return api.post<Task>('/tasks', data);
  },

  /**
   * 预估费用
   */
  estimateCost: async (data: EstimateCostRequest): Promise<EstimateCostResponse> => {
    return api.post<EstimateCostResponse>('/tasks/estimate', data);
  },

  /**
   * 获取任务列表
   */
  getTasks: async (params?: ListTasksParams): Promise<PaginatedResponse<Task>> => {
    return api.get<PaginatedResponse<Task>>('/tasks', { params });
  },

  /**
   * 获取任务详情
   */
  getTask: async (id: string): Promise<Task> => {
    return api.get<Task>(`/tasks/${id}`);
  },

  /**
   * 获取任务日志
   */
  getTaskLogs: async (taskId: string): Promise<TaskLog[]> => {
    return api.get<TaskLog[]>(`/tasks/${taskId}/logs`);
  },

  /**
   * 取消任务
   */
  cancelTask: async (id: string): Promise<Task> => {
    return api.post<Task>(`/tasks/${id}/cancel`);
  },

  /**
   * 重试失败的任务
   */
  retryTask: async (id: string): Promise<Task> => {
    return api.post<Task>(`/tasks/${id}/retry`);
  },
};

export default taskApi;
