/**
 * 从 cover_image 字段中提取第一张图片URL
 * cover_image 可能包含多张以 | 分隔的图片
 */
export function getFirstImage(coverImage: string | null | undefined): string | null {
  if (!coverImage) return null;
  const images = coverImage.split('|');
  return images[0]?.trim() || null;
}

/**
 * 判断 URL 是否为相对路径（不以协议或 / 开头）
 */
export function isRelativePath(url: string): boolean {
  return !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/');
}

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || '/api/v1';

/**
 * 将 API 路径转为完整 URL（带域名）
 * 例如 "/api/v1/files/works/xxx" → "http://localhost:8000/api/v1/files/works/xxx"
 * 相对路径通过当前域名直接访问
 */
export function resolveApiUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url; // 通过当前域名的网关代理访问
  return null;
}

/**
 * 将 WorkFile 的 file_url 转为可用的图片/文件 URL
 * - 如果已经是完整 URL（http/https 开头），直接返回
 * - 如果已经是 API 路径（/ 开头），直接返回（由网关代理）
 * - 如果是旧版相对路径（如 images/page_001.png），构造文件服务 URL
 */
export function getFileUrl(file: { id: string; file_url: string }): string {
  const url = file.file_url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    // 已经是 API 路径，如 /api/v1/files/works/{id}
    return url;
  }
  // 旧版相对路径，构造文件服务 URL
  return `${API_BASE_URL}/files/works/${file.id}`;
}
