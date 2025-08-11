// 速率限制存储结构
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 速率限制检查函数 (适配 Pages)
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  // 在 Pages 玎境中，优先使用绑定的 KV
  if (kv && typeof kv.get === 'function') {
    return checkRateLimitKV(kv, identifier, maxRequests, windowMs);
  }

  // 如果没有配置 KV，降级到内存存储
  return checkRateLimitMemory(identifier, maxRequests, windowMs);
}

// KV存储实现
async function checkRateLimitKV(
  kv: KVNamespace,
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  
  try {
    const entryStr = await kv.get(key);
    let entry: RateLimitEntry | null = null;
    
    if (entryStr) {
      entry = JSON.parse(entryStr) as RateLimitEntry;
    }
    
    if (!entry || entry.resetTime <= now) {
      // 第一次请求或窗口已过期，重置计数器
      const resetTime = now + windowMs;
      await kv.put(key, JSON.stringify({ count: 1, resetTime }), { expirationTtl: Math.ceil(windowMs / 1000) });
      return { allowed: true, resetTime, remaining: maxRequests - 1 };
    }
    
    if (entry.count >= maxRequests) {
      // 超过限制
      return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
    }
    
    // 增加计数
    const newCount = entry.count + 1;
    await kv.put(key, JSON.stringify({ count: newCount, resetTime: entry.resetTime }), { expirationTtl: Math.ceil((entry.resetTime - now) / 1000) });
    return { allowed: true, resetTime: entry.resetTime, remaining: maxRequests - newCount };
  } catch (error) {
    // KV操作失败时，降级到内存存储
    console.error('Rate limit KV error, 降级到内存存储:', error);
    return checkRateLimitMemory(identifier, maxRequests, windowMs);
  }
}

// 内存存储作为备用方案
const memoryStore: Map<string, { entry: string; expiration: number }> = new Map();

function checkRateLimitMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; resetTime?: number; remaining?: number } {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  
  // 清理过期条目
  for (const [k, value] of memoryStore.entries()) {
    if (value.expiration <= now) {
      memoryStore.delete(k);
    }
  }
  
  const stored = memoryStore.get(key);
  let entry: RateLimitEntry | null = null;
  
  if (stored) {
    entry = JSON.parse(stored.entry) as RateLimitEntry;
  }
  
  // 如果没有记录或者窗口已过期，重置计数器
  if (!entry || entry.resetTime <= now) {
    const resetTime = now + windowMs;
    const newEntry = { count: 1, resetTime };
    memoryStore.set(key, {
      entry: JSON.stringify(newEntry),
      expiration: resetTime
    });
    return { allowed: true, resetTime, remaining: maxRequests - 1 };
  }
  
  // 如果达到限制
  if (entry.count >= maxRequests) {
    return { allowed: false, resetTime: entry.resetTime, remaining: 0 };
  }
  
  // 增加计数
  const newCount = entry.count + 1;
  const newEntry = { count: newCount, resetTime: entry.resetTime };
  memoryStore.set(key, {
    entry: JSON.stringify(newEntry),
    expiration: entry.resetTime
  });
  
  return { allowed: true, resetTime: entry.resetTime, remaining: maxRequests - newCount };
}

// JWT 密钥类型
interface JWTSecret {
  alg: 'HS256' | 'HS512'
  key: string
}

// JWT 载荷
interface JWTPayload {
  sub: string // 用户ID
  iat: number // 签发时间
  exp: number // 过期时间
  [key: string]: any // 其他自定义声明
}

// 生成JWT
export async function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: JWTSecret, expiresIn: number = 3600): Promise<string> {
  const header = { alg: secret.alg, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  }
  
  const encoder = new TextEncoder()
  const headerBase64 = btoa(JSON.stringify(header))
  const payloadBase64 = btoa(JSON.stringify(fullPayload))
  const signatureInput = `${headerBase64}.${payloadBase64}`
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret.key),
    { name: 'HMAC', hash: { name: `SHA-${secret.alg.slice(2)}` } },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  )
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${headerBase64}.${payloadBase64}.${signatureBase64}`
}

// 验证JWT
export async function verifyJWT(token: string, secret: JWTSecret): Promise<JWTPayload | null> {
  try {
    const [headerBase64, payloadBase64, signatureBase64] = token.split('.')
    if (!headerBase64 || !payloadBase64 || !signatureBase64) return null
    
    const header = JSON.parse(atob(headerBase64))
    if (header.alg !== secret.alg) return null
    
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret.key),
      { name: 'HMAC', hash: { name: `SHA-${secret.alg.slice(2)}` } },
      false,
      ['verify']
    )
    
    const signatureInput = `${headerBase64}.${payloadBase64}`
    const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0))
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signatureInput)
    )
    
    if (!isValid) return null
    
    const payload = JSON.parse(atob(payloadBase64)) as JWTPayload
    const now = Math.floor(Date.now() / 1000)
    
    if (payload.exp < now) return null // 令牌已过期
    
    return payload
  } catch (error) {
    return null
  }
}

// 验证文件类型
export function isAllowedFileType(fileType: string, allowedTypes: string): boolean {
  if (!allowedTypes) return true; // 如果没有设置限制，则允许所有类型
  
  const allowedTypesArray = allowedTypes.split(',').map(type => type.trim());
  return allowedTypesArray.includes(fileType);
}

// 清理文件名，防止路径遍历攻击
export function sanitizeFileName(fileName: string): string {
  // 移除路径部分，只保留文件名
  let name = fileName.replace(/.*[/\\]/, '');
  
  // 移除危险字符
  name = name.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // 防止特殊文件名
  if (name === '.' || name === '..') {
    name = 'unnamed';
  }
  
  // 防止隐藏文件（以.开头的文件）
  if (name.startsWith('.')) {
    name = 'unnamed' + name;
  }
  
  // 移除连续的点
  name = name.replace(/\.+/g, '.');
  
  // 确保文件名不以点结尾
  if (name.endsWith('.')) {
    name = name.slice(0, -1) + '_';
  }

  // 限制长度
  if (name.length > 255) {
    const extension = name.split('.').pop() || '';
    const nameWithoutExtension = name.substring(0, name.length - extension.length - 1);
    name = nameWithoutExtension.substring(0, 255 - extension.length - 1) + '.' + extension;
  }
  
  // 确保文件名不为空
  if (!name) {
    name = 'unnamed';
  }
  
  return name;
}