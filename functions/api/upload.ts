import { sanitizeFileName, isAllowedFileType, checkRateLimit, verifyJWT } from '../lib/security';

// 计算当前存储使用量的辅助函数
async function getCurrentStorageUsage(bucket: R2Bucket, prefix: string = ''): Promise<number> {
  let totalSize = 0;
  let cursor: string | undefined = undefined;
  
  do {
    const list = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const obj of list.objects) {
      totalSize += obj.size;
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  
  return totalSize;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // 速率限制检查
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `upload:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 10,
    context.env.RATE_LIMIT_WINDOW_MS || 60000
  );
  
  if (!rateLimitResult.allowed) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }
  
  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('未授权 - 需要Bearer令牌', { status: 401 })
  }
  
  const token = authHeader.slice(7)
  const payload = await verifyJWT(
    token,
    { alg: 'HS256', key: context.env.JWT_SECRET || 'default-secret-please-change-me' }
  )
  
  if (!payload || payload.sub !== context.env.USERNAME) {
    return new Response('未授权 - 令牌无效', { status: 401 })
  }
  
  try {
    const form = await context.request.formData()
    const file = form.get('file') as File
    if (!file) return new Response('未选择文件', { status: 400 })
    
    // 检查文件类型
    const allowedFileTypes = context.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg';
    if (!isAllowedFileType(file.type, allowedFileTypes)) {
      return new Response(`不支持的文件类型: ${file.type}`, { status: 400 });
    }
    
    // 检查文件大小限制
    const maxFileSize = context.env.MAX_FILE_SIZE_BYTES || 50 * 1024 * 1024; // 默认50MB
    if (file.size > maxFileSize) {
      return new Response(`文件大小超过限制 (${maxFileSize / (1024 * 1024)} MB)`, { status: 400 });
    }
    
    const path = (form.get('path') as string) || ''
    
    // 添加路径验证，防止路径遍历攻击
    if (path.includes('../') || path.includes('..\\') || path.startsWith('/')) {
      return new Response('无效的路径', { status: 400 });
    }
    
    const prefix = context.env.UPLOAD_PREFIX || ''
    let key = (prefix + path + sanitizeFileName(file.name)).replace(/\/+/g, '/')
    
    // 再次检查最终路径，防止路径遍历攻击
    if (key.includes('../') || key.includes('..\\') || key.startsWith('/')) {
      return new Response('无效的文件路径', { status: 400 });
    }
    
    if (key.startsWith('/')) key = key.slice(1)
    
    // 检查存储空间限制
    const maxStorage = context.env.MAX_STORAGE_BYTES || 6 * 1024 * 1024 * 1024; // 默认6GB
    const currentStorage = await getCurrentStorageUsage(context.env.R2, prefix);
    
    if (currentStorage + file.size > maxStorage) {
      return new Response(`存储空间不足 (最大 ${maxStorage / (1024 * 1024 * 1024)} GB)`, { status: 400 });
    }
    
    // 获取图片尺寸信息（如果是图片）
    let metadata: Record<string, any> = {}
    if (file.type.startsWith('image/')) {
      try {
        // 这里可以添加获取图片尺寸的逻辑
        // 由于Workers环境限制，我们只能存储文件大小信息
        metadata = {
          width: null,
          height: null,
          size: file.size,
          type: file.type
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    await context.env.R2.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        contentLength: file.size
      },
      customMetadata: metadata
    })
    
    return Response.json({ success: true, key, metadata })
  } catch (error) {
    return new Response('上传失败: ' + (error as Error).message, { status: 500 })
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // 速率限制检查
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `delete:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 10,
    context.env.RATE_LIMIT_WINDOW_MS || 60000
  );
  
  if (!rateLimitResult.allowed) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }
  
  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('未授权 - 需要Bearer令牌', { status: 401 })
  }
  
  const token = authHeader.slice(7)
  const payload = await verifyJWT(
    token,
    { alg: 'HS256', key: context.env.JWT_SECRET || 'default-secret-please-change-me' }
  )
  
  if (!payload || payload.sub !== context.env.USERNAME) {
    return new Response('未授权 - 令牌无效', { status: 401 })
  }
  
  try {
    const body = await context.request.json() as { key?: string; keys?: string[] }
    
    // 验证key参数，防止路径遍历攻击
    if (body.key) {
      if (body.key.includes('../') || body.key.includes('..\\') || body.key.startsWith('/')) {
        return new Response('无效的文件路径', { status: 400 });
      }
      
      // 删除单个文件
      await context.env.R2.delete(body.key)
      return Response.json({ success: true })
    } else if (body.keys && Array.isArray(body.keys)) {
      // 验证所有keys参数
      for (const key of body.keys) {
        if (key.includes('../') || key.includes('..\\') || key.startsWith('/')) {
          return new Response('无效的文件路径', { status: 400 });
        }
      }
      
      // 批量删除文件
      await context.env.R2.delete(body.keys)
      return Response.json({ success: true })
    } else {
      return new Response('无效的请求参数', { status: 400 })
    }
  } catch (error) {
    return new Response('删除失败: ' + (error as Error).message, { status: 500 })
  }
}