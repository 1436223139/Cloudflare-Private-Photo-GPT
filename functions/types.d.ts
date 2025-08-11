interface Env {
  // 环境变量类型定义
  USERNAME: string;
  PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // 上传相关
  ALLOWED_FILE_TYPES: string;
  MAX_FILE_SIZE_BYTES: string;
  MAX_STORAGE_BYTES: string;
  UPLOAD_PREFIX: string;
  
  // 访客访问控制
  GUEST_DISABLED: string;
  
  // 速率限制
  RATE_LIMIT_REQUESTS: string;
  RATE_LIMIT_WINDOW_MS: string;
  
  // KV命名空间
  RATE_LIMIT_KV: any;
  GUEST_ACCESS_KV: any; // 专用访客访问状态KV命名空间
  
  // R2存储桶
  R2: any;
}