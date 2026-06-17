/**
 * 用户文件上传模块 API
 */

import { api } from '../client';
import type { UploadedFileMeta } from '../types';

export interface UploadOptions {
  toolId?: string;
  fieldKey?: string;
}

export const uploadApi = {
  /**
   * 上传文件到 /files/uploads
   * 不手动设置 Content-Type，让 axios/浏览器自动设置 multipart boundary。
   */
  uploadFile: async (file: File, options?: UploadOptions): Promise<UploadedFileMeta> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.toolId) formData.append('tool_id', options.toolId);
    if (options?.fieldKey) formData.append('field_key', options.fieldKey);
    return api.post<UploadedFileMeta>('/files/uploads', formData);
  },
};

export default uploadApi;
