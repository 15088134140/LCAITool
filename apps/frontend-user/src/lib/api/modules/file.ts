/** 文件上传 API */
import { api } from '../client';

export interface UploadedFileResponse {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
}

export const fileApi = {
  uploadFile: async (
    file: File,
    params: { toolId?: string; fieldKey?: string } = {}
  ): Promise<UploadedFileResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (params.toolId) formData.append('tool_id', params.toolId);
    if (params.fieldKey) formData.append('field_key', params.fieldKey);

    return api.post<UploadedFileResponse>('/files/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default fileApi;
