/**
 * 灵创AI工具箱 - API客户端统一导出
 */

// 导出类型
export * from './types';

// 导出基础客户端
export { apiClient, api, tokenStorage } from './client';

// 导出各模块API
export * from './modules/user';
export * from './modules/tool';
export * from './modules/task';
export * from './modules/work';
export * from './modules/payment';
export * from './modules/idea';
export * from './modules/chat';
export * from './modules/feedback';
export * from './modules/file';
export * from './modules/upload';

// 按命名空间导出，方便使用
import { authApi, userApi } from './modules/user';
import { categoryApi, toolApi } from './modules/tool';
import { taskApi } from './modules/task';
import { workApi } from './modules/work';
import { paymentApi } from './modules/payment';
import { ideaApi } from './modules/idea';
import { chatApi } from './modules/chat';
import { feedbackApi } from './modules/feedback';
import { fileApi } from './modules/file';
import { uploadApi } from './modules/upload';

export const apiModules = {
  auth: { ...authApi },
  user: { ...userApi },
  category: { ...categoryApi },
  tool: { ...toolApi },
  task: { ...taskApi },
  work: { ...workApi },
  payment: { ...paymentApi },
  idea: { ...ideaApi },
  chat: { ...chatApi },
  feedback: { ...feedbackApi },
  file: { ...fileApi },
  upload: { ...uploadApi },
};

export default apiModules;
