/**
 * 任务模块 API
 */

import { api } from '../client';
import type {
  Task,
  TaskLog,
  CreateTaskRequest,
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
  getTaskLogs: async (taskId: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<TaskLog>> => {
    return api.get<PaginatedResponse<TaskLog>>(`/tasks/${taskId}/logs`, {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 取消任务
   */
  cancelTask: async (id: string, reason?: string): Promise<Task> => {
    return api.post<Task>(`/tasks/${id}/cancel`, undefined, { params: { reason } });
  },
};

export default taskApi;
