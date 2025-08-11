import { checkRateLimit, verifyJWT } from '../lib/security';

export const onRequestGet = async (context) => {
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
  
  // 检查是否提供了认证头
  const authHeader = context.request.headers.get('Authorization');
  
  // 如果提供了认证头，验证令牌
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return new Response('未授权 - 需要Bearer令牌', { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const payload = await verifyJWT(
      token,
      { alg: 'HS256', key: context.env.JWT_SECRET || 'default-secret-please-change-me' }
    );
    
    if (!payload || payload.sub !== context.env.USERNAME) {
      return new Response('未授权 - 令牌无效', { status: 401 });
    }
  }
  
  // 如果没有提供凭据，检查访客访问是否被禁用
  if (!authHeader) {
    // 首先检查环境变量中是否禁用了访客访问
    const envGuestDisabled = context.env.GUEST_DISABLED === 'true';
    if (envGuestDisabled) {
      return new Response('访客访问已被环境变量全局禁用', { status: 401 });
    }
    
    // 如果环境变量未禁用，则检查KV中存储的动态访客访问状态
    let kvGuestDisabled = false;
    if (context.env.GUEST_ACCESS_KV && typeof context.env.GUEST_ACCESS_KV.get === 'function') {
      try {
        const guestDisabledValue = await context.env.GUEST_ACCESS_KV.get('guest_access_disabled');
        kvGuestDisabled = guestDisabledValue === 'true';
      } catch (e) {
        console.error('获取访客访问状态失败:', e);
      }
    }
    
    if (kvGuestDisabled) {
      return new Response('访客访问已被管理员禁用', { status: 401 });
    }
  }
  
  // 如果没有提供凭据，我们允许访问（访客模式）
  
  const prefix = context.env.UPLOAD_PREFIX || '';
  const list = await context.env.R2.list({ prefix });
  
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
  })));
};