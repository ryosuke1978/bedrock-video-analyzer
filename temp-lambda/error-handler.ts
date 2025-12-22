/**
 * 包括的エラーハンドリングユーティリティ
 * 要件9.4, 9.5に対応
 */

import { APIGatewayProxyResult } from 'aws-lambda';

// エラータイプの定義
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  BEDROCK_ERROR = 'BEDROCK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
}

// カスタムエラークラス
export class VideoAnalyzerError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'VideoAnalyzerError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// リトライ設定
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

// デフォルトリトライ設定
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterEnabled: true
};

// 同時実行制限管理
class ConcurrencyManager {
  private static instance: ConcurrencyManager;
  private activeRequests: Map<string, number> = new Map();
  private readonly maxConcurrentRequests: number;

  private constructor() {
    this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5');
  }

  public static getInstance(): ConcurrencyManager {
    if (!ConcurrencyManager.instance) {
      ConcurrencyManager.instance = new ConcurrencyManager();
    }
    return ConcurrencyManager.instance;
  }

  public async acquireSlot(requestType: string): Promise<void> {
    const current = this.activeRequests.get(requestType) || 0;
    
    if (current >= this.maxConcurrentRequests) {
      throw new VideoAnalyzerError(
        ErrorType.CONCURRENT_LIMIT_EXCEEDED,
        `同時実行数の制限に達しました。しばらく時間をおいてから再度お試しください。`,
        429,
        true,
        { 
          requestType, 
          currentCount: current, 
          maxAllowed: this.maxConcurrentRequests 
        }
      );
    }

    this.activeRequests.set(requestType, current + 1);
  }

  public releaseSlot(requestType: string): void {
    const current = this.activeRequests.get(requestType) || 0;
    if (current > 0) {
      this.activeRequests.set(requestType, current - 1);
    }
  }

  public getCurrentCount(requestType: string): number {
    return this.activeRequests.get(requestType) || 0;
  }
}

// リソース監視クラス
class ResourceMonitor {
  private static instance: ResourceMonitor;

  private constructor() {}

  public static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  public async checkResourceAvailability(): Promise<void> {
    // メモリ使用量チェック
    const memoryUsage = process.memoryUsage();
    const maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB || '1024');
    const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024;

    if (currentMemoryMB > maxMemoryMB * 0.9) {
      throw new VideoAnalyzerError(
        ErrorType.RESOURCE_EXHAUSTED,
        'メモリ使用量が制限に近づいています。処理を一時停止します。',
        503,
        true,
        { 
          currentMemoryMB: Math.round(currentMemoryMB),
          maxMemoryMB,
          usagePercentage: Math.round((currentMemoryMB / maxMemoryMB) * 100)
        }
      );
    }

    // CPU使用率チェック（簡易版）
    const startTime = process.hrtime.bigint();
    await new Promise(resolve => setTimeout(resolve, 10));
    const endTime = process.hrtime.bigint();
    const cpuTime = Number(endTime - startTime) / 1000000; // ナノ秒をミリ秒に変換

    if (cpuTime > 50) { // 50ms以上かかった場合は高負荷と判定
      console.warn('High CPU usage detected:', { cpuTime });
    }
  }
}

// 指数バックオフリトライ実装
export async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  errorContext?: string
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // リトライ不可能なエラーの場合は即座に失敗
      if (error instanceof VideoAnalyzerError && !error.retryable) {
        throw error;
      }

      // 最後の試行の場合はエラーを投げる
      if (attempt === config.maxRetries) {
        console.error(`Operation failed after ${config.maxRetries + 1} attempts:`, {
          context: errorContext,
          error: lastError.message,
          attempts: attempt + 1
        });
        break;
      }

      // 遅延時間を計算（指数バックオフ + ジッター）
      let delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );

      if (config.jitterEnabled) {
        delay = delay * (0.5 + Math.random() * 0.5); // 50-100%のランダムジッター
      }

      console.warn(`Operation failed, retrying in ${Math.round(delay)}ms:`, {
        context: errorContext,
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        error: lastError.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// グレースフルデグラデーション実装
export class GracefulDegradation {
  private static degradationLevel: number = 0; // 0: 正常, 1: 軽度, 2: 中度, 3: 重度

  public static getDegradationLevel(): number {
    return this.degradationLevel;
  }

  public static setDegradationLevel(level: number): void {
    this.degradationLevel = Math.max(0, Math.min(3, level));
    console.info(`Degradation level set to: ${this.degradationLevel}`);
  }

  public static shouldSkipOptionalFeature(featureLevel: number): boolean {
    return this.degradationLevel >= featureLevel;
  }

  public static getReducedQualitySettings(): any {
    switch (this.degradationLevel) {
      case 1:
        return {
          maxResolution: '1080p',
          compressionLevel: 'medium',
          analysisDepth: 'standard'
        };
      case 2:
        return {
          maxResolution: '720p',
          compressionLevel: 'high',
          analysisDepth: 'basic'
        };
      case 3:
        return {
          maxResolution: '480p',
          compressionLevel: 'maximum',
          analysisDepth: 'minimal'
        };
      default:
        return {
          maxResolution: '4K',
          compressionLevel: 'low',
          analysisDepth: 'comprehensive'
        };
    }
  }
}

// エラーレスポンス生成
export function createErrorResponse(
  error: Error | VideoAnalyzerError,
  requestId?: string
): APIGatewayProxyResult {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  if (error instanceof VideoAnalyzerError) {
    return {
      statusCode: error.statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Request-ID': requestId || 'unknown'
      },
      body: JSON.stringify({
        error: {
          type: error.type,
          message: error.message,
          retryable: error.retryable,
          details: error.details,
          timestamp: error.timestamp,
          requestId: requestId
        }
      })
    };
  }

  // 一般的なエラーの場合
  const statusCode = getStatusCodeFromError(error);
  const errorType = getErrorTypeFromError(error);
  
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId || 'unknown'
    },
    body: JSON.stringify({
      error: {
        type: errorType,
        message: error.message || 'An unexpected error occurred',
        retryable: isRetryableError(error),
        timestamp: new Date().toISOString(),
        requestId: requestId
      }
    })
  };
}

// エラーからステータスコードを取得
function getStatusCodeFromError(error: Error): number {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return 404;
  }
  if (errorMessage.includes('unauthorized') || errorMessage.includes('access denied')) {
    return 403;
  }
  if (errorMessage.includes('bad request') || errorMessage.includes('invalid')) {
    return 400;
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 408;
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('throttle')) {
    return 429;
  }
  if (errorMessage.includes('service unavailable') || errorMessage.includes('temporarily unavailable')) {
    return 503;
  }
  
  return 500;
}

// エラーからエラータイプを取得
function getErrorTypeFromError(error: Error): ErrorType {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return ErrorType.VALIDATION_ERROR;
  }
  if (errorMessage.includes('not found')) {
    return ErrorType.RESOURCE_NOT_FOUND;
  }
  if (errorMessage.includes('timeout')) {
    return ErrorType.TIMEOUT_ERROR;
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('throttle')) {
    return ErrorType.RATE_LIMIT_EXCEEDED;
  }
  if (errorMessage.includes('bedrock')) {
    return ErrorType.BEDROCK_ERROR;
  }
  if (errorMessage.includes('dynamodb') || errorMessage.includes('database')) {
    return ErrorType.DATABASE_ERROR;
  }
  if (errorMessage.includes('s3') || errorMessage.includes('storage')) {
    return ErrorType.STORAGE_ERROR;
  }
  
  return ErrorType.INTERNAL_ERROR;
}

// リトライ可能エラーかどうかを判定
function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  
  // リトライ可能なエラー
  const retryablePatterns = [
    'timeout',
    'temporarily unavailable',
    'service unavailable',
    'rate limit',
    'throttle',
    'network',
    'connection',
    'internal server error'
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

// エラーハンドリングミドルウェア
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    const requestId = generateRequestId();
    const concurrencyManager = ConcurrencyManager.getInstance();
    const resourceMonitor = ResourceMonitor.getInstance();
    
    try {
      // リソース可用性チェック
      await resourceMonitor.checkResourceAvailability();
      
      // 同時実行制限チェック
      await concurrencyManager.acquireSlot(context || 'default');
      
      try {
        return await handler(...args);
      } finally {
        concurrencyManager.releaseSlot(context || 'default');
      }
      
    } catch (error) {
      console.error(`Error in ${context || 'handler'}:`, {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  };
}

// リクエストID生成
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// エクスポート
export { ConcurrencyManager, ResourceMonitor };