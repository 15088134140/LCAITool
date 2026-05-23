/**
 * 从 cover_image 字段中提取第一张图片URL
 * cover_image 可能包含多张以 | 分隔的图片
 */
export function getFirstImage(coverImage: string | null | undefined): string | null {
  if (!coverImage) return null;
  const images = coverImage.split('|');
  return images[0]?.trim() || null;
}
