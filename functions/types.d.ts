export interface Env {
  R2: R2Bucket
  PASSWORD: string
  USERNAME: string
  UPLOAD_PREFIX?: string
  RATE_LIMIT_KV?: KVNamespace
  RATE_LIMIT_REQUESTS?: number
  RATE_LIMIT_WINDOW_MS?: number
  // 添加更多安全相关配置
  ALLOWED_FILE_TYPES?: string
  MAX_FILE_SIZE_BYTES?: number
}