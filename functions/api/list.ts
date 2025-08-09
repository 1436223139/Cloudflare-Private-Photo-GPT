import { checkRateLimit, verifyJWT } from '../lib/security';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 速率限制检查（对访客也有限制）
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `list:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 20,
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
  
  // 如果没有提供凭据，我们允许访问（访感模式）
  
  const prefix = context.env.UPLOAD_PREFIX || ''
  const list = await context.env.R2.list({ prefix })
  
  // 过滤掉可能的路径遍历文件
  const filteredObjects = list.objects.filter(obj => 
    !obj.key.includes('../') && 
    !obj.key.includes('..\\') &&
    !obj.key.startsWith('/')
  );
  
  return Response.json(filteredObjects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    httpMetadata: obj.httpMetadata,
    customMetadata: obj.customMetadata
  })))
}