// 工具函数
export function encodeKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('___');
}

// 判断文件类型
export function getMediaType(key: string): 'image' | 'video' | null {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
  
  const ext = key.split('.').pop()?.toLowerCase() || '';
  
  if (imageExtensions.includes(ext)) {
    return 'image';
  }
  
  if (videoExtensions.includes(ext)) {
    return 'video';
  }
  
  return null;
}