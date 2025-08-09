import { checkRateLimit } from '../lib/security';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // 速率限制检查
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitResult = await checkRateLimit(
    context.env.RATE_LIMIT_KV,
    `r2:${ip}`,
    context.env.RATE_LIMIT_REQUESTS || 50,
    context.env.RATE_LIMIT_WINDOW_MS || 60000
  );
  
  if (!rateLimitResult.allowed) {
    return new Response('请求过于频繁，请稍后再试', { status: 429 });
  }
  
  // key 形如 encodeURIComponent(a)___encodeURIComponent(b)___encodeURIComponent(c)
  let key = context.params.key as string;
  key = key.split('___').map(decodeURIComponent).join('/');
  
  // 防止路径遍历攻击 - 立即返回错误而不是继续处理
  if (key.includes('../') || key.includes('..\\') || key.startsWith('/')) {
    return new Response('无效的文件路径', { status: 400 });
  }
  
  const obj = await context.env.R2.get(key);
  if (!obj) return new Response('未找到', { status: 404 });

  // 获取查询参数
  const url = new URL(context.request.url);
  const width = url.searchParams.get('width');
  const height = url.searchParams.get('height');
  const quality = url.searchParams.get('quality') || '80';

  let responseInit = {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000'
    }
  };

  // 如果有尺寸参数且是图片，则使用 Cloudflare Image Resizing
  if ((width || height) && obj.httpMetadata?.contentType?.startsWith('image/')) {
    responseInit.headers['content-type'] = obj.httpMetadata.contentType;
    return new Response(obj.body, responseInit);
  }

  return new Response(obj.body, responseInit);
};