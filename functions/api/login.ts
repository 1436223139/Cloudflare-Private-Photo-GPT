import { checkRateLimit, generateJWT } from '../lib/security';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // 速率限制检查（针对登录更严格）
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `login:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 5,
    context.env.RATE_LIMIT_WINDOW_MS || 60000
  );
  
  if (!rateLimitResult.allowed) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }
  
  try {
    const { username, password } = await context.request.json() as { username: string; password: string };
    
    // 验证用户名和密码
    if (!username || !password || password !== context.env.PASSWORD || username !== context.env.USERNAME) {
      // 记录登录失败（如果配置了KV）
      if (context.env.RATE_LIMIT_KV && typeof context.env.RATE_LIMIT_KV.put === 'function') {
        const failKey = `login_fail:${ip}:${Date.now()}`;
        await context.env.RATE_LIMIT_KV.put(failKey, JSON.stringify({ username, timestamp: Date.now() }), { 
          expirationTtl: 3600 // 保留1小时
        });
      }
      return new Response('用户名或密码错误', { status: 401 });
    }
    
    // 生成JWT令牌
    const token = await generateJWT(
      { sub: username },
      { alg: 'HS256', key: context.env.JWT_SECRET || 'default-secret-please-change-me' },
      context.env.JWT_EXPIRES_IN || 3600
    );
    
    return Response.json({ 
      success: true,
      token,
      expiresIn: context.env.JWT_EXPIRES_IN || 3600
    });
  } catch (error) {
    return new Response('请求参数错误', { status: 400 });
  }
}