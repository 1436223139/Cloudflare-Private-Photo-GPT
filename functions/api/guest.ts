import { verifyJWT } from '../lib/security';

// 获取访客访问状态
export const onRequestGet = async (context) => {
  // 检查认证头
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('未授权 - 需要Bearer令牌', { status: 401 });
  }
  
  // 验证JWT
  const token = authHeader.slice(7);
  const jwtSecret = context.env.JWT_SECRET || 'default-secret-please-change-me';
  
  const payload = await verifyJWT(token, { alg: 'HS256', key: jwtSecret });
  
  if (!payload || payload.sub !== context.env.USERNAME) {
    return new Response('未授权 - 令牌无效', { status: 401 });
  }
  
  // 检查环境变量配置 - 只有明确设置为true才认为是全局禁用
  const envGuestDisabled = context.env.GUEST_DISABLED === 'true';
  
  // 如果环境变量已全局禁用
  if (envGuestDisabled) {
    return Response.json({ 
      disabled: true, 
      global: true,
      message: '访客访问已被系统管理员全局禁用，当前配置不可更改'
    });
  }
  
  // 检查KV存储配置
  if (!context.env.GUEST_ACCESS_KV || typeof context.env.GUEST_ACCESS_KV.get !== 'function') {
    // KV未配置，返回默认状态（访客访问启用）
    return Response.json({ 
      disabled: false,
      global: false
    });
  }
  
  // 获取访客访问状态
  let kvGuestDisabled = false;
  try {
    const guestDisabledValue = await context.env.GUEST_ACCESS_KV.get('guest_access_disabled');
    // 如果没有设置过值，默认为false（启用访客访问）
    kvGuestDisabled = guestDisabledValue === 'true';
  } catch (e) {
    console.error('获取访客访问状态失败:', e);
    // 出错时默认启用访客访问
    kvGuestDisabled = false;
  }
  
  return Response.json({ 
    disabled: kvGuestDisabled,
    global: false
  });
};

// 更新访客访问状态
export const onRequestPost = async (context) => {
  // 检查认证头
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('未授权 - 需要Bearer令牌', { status: 401 });
  }
  
  // 验证JWT
  const token = authHeader.slice(7);
  const jwtSecret = context.env.JWT_SECRET || 'default-secret-please-change-me';
  
  const payload = await verifyJWT(token, { alg: 'HS256', key: jwtSecret });
  
  if (!payload || payload.sub !== context.env.USERNAME) {
    return new Response('未授权 - 令牌无效', { status: 401 });
  }
  
  // 检查环境变量配置 - 只有明确设置为true才认为是全局禁用
  const envGuestDisabled = context.env.GUEST_DISABLED === 'true';
  
  // 如果环境变量已全局禁用
  if (envGuestDisabled) {
    return new Response('访客访问已被系统管理员全局禁用，当前配置不可更改', { status: 400 });
  }
  
  // 检查KV存储配置
  if (!context.env.GUEST_ACCESS_KV || typeof context.env.GUEST_ACCESS_KV.put !== 'function') {
    return new Response('服务器配置错误：KV存储未正确配置', { status: 500 });
  }
  
  // 处理请求体
  try {
    const { disabled } = await context.request.json();
    
    // 验证请求参数类型
    if (typeof disabled !== 'boolean') {
      return new Response('请求参数类型错误：disabled必须为布尔值', { status: 400 });
    }
    
    // 更新访客访问状态
    await context.env.GUEST_ACCESS_KV.put('guest_access_disabled', disabled ? 'true' : 'false');
    
    return Response.json({ 
      success: true, 
      disabled,
      global: false,  // 确保返回的数据格式与GET请求一致
      message: disabled ? '访客访问已禁用' : '访客访问已启用'
    });
  } catch (e) {
    return new Response('请求参数错误或解析失败', { status: 400 });
  }
};