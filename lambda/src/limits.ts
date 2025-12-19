import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  VideoAnalyzerError, 
  ErrorType, 
  createErrorResponse, 
  withErrorHandling
} from './utils/error-handler';

// システム制限情報
interface SystemLimits {
  videoFormats: VideoFormatInfo[];
  fileSizeLimits: FileSizeLimits;
  videoLengthLimits: VideoLengthLimits;
  resolutionLimits: ResolutionLimits;
  apiLimits: ApiLimits;
  pricingInfo: PricingInfo;
  lastUpdated: string;
}

interface VideoFormatInfo {
  format: string;
  extension: string;
  description: string;
  maxFileSize: string;
  supported: boolean;
  notes?: string;
}

interface FileSizeLimits {
  maxFileSizeBytes: number;
  maxFileSizeDisplay: string;
  recommendedMaxSize: string;
  warningThreshold: string;
}

interface VideoLengthLimits {
  maxDurationSeconds: number;
  maxDurationDisplay: string;
  recommendedMaxDuration: string;
  processingTimeEstimate: string;
}

interface ResolutionLimits {
  maxWidth: number;
  maxHeight: number;
  maxPixels: number;
  recommendedResolution: string;
  supportedAspectRatios: string[];
}

interface ApiLimits {
  bedrockRateLimit: RateLimit;
  s3RateLimit: RateLimit;
  dynamoDbLimits: DynamoDbLimits;
  concurrentAnalyses: number;
  dailyAnalysisLimit: number;
}

interface RateLimit {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstCapacity: number;
}

interface DynamoDbLimits {
  readCapacityUnits: number;
  writeCapacityUnits: number;
  itemSizeLimit: string;
  queryLimit: number;
}

interface PricingInfo {
  currency: string;
  region: string;
  s3Storage: StoragePricing;
  dynamoDb: DynamoDbPricing;
  lambda: LambdaPricing;
  bedrock: BedrockPricing;
  estimatedCostPerAnalysis: CostEstimate;
}

interface StoragePricing {
  standardPerGB: number;
  standardIAPerGB: number;
  glacierPerGB: number;
  requestsPer1000: number;
}

interface DynamoDbPricing {
  readCapacityUnit: number;
  writeCapacityUnit: number;
  storagePerGB: number;
}

interface LambdaPricing {
  requestsPer1M: number;
  gbSecond: number;
}

interface BedrockPricing {
  pegasusPerRequest: number;
  estimatedRequestsPerAnalysis: number;
}

interface CostEstimate {
  minimum: number;
  typical: number;
  maximum: number;
  breakdown: {
    s3: number;
    dynamoDb: number;
    lambda: number;
    bedrock: number;
  };
}

// メインハンドラー（包括的エラーハンドリング付き）
const limitsHandlerCore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Limits API called:', JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const path = event.path;

    // CORS ヘッダー
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };

    // OPTIONS リクエスト（CORS プリフライト）
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // GET リクエストのみサポート
    if (method !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET method is supported'
        })
      };
    }

    // システム制限情報の取得
    const limits = await getSystemLimits();

    // クエリパラメータに基づく情報フィルタリング
    const queryParams = event.queryStringParameters || {};
    const section = queryParams.section;

    let responseData: any = limits;

    if (section) {
      switch (section.toLowerCase()) {
        case 'formats':
          responseData = { videoFormats: limits.videoFormats };
          break;
        case 'filesize':
          responseData = { fileSizeLimits: limits.fileSizeLimits };
          break;
        case 'duration':
          responseData = { videoLengthLimits: limits.videoLengthLimits };
          break;
        case 'resolution':
          responseData = { resolutionLimits: limits.resolutionLimits };
          break;
        case 'api':
          responseData = { apiLimits: limits.apiLimits };
          break;
        case 'pricing':
          responseData = { pricingInfo: limits.pricingInfo };
          break;
        default:
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Invalid section',
              message: 'Valid sections: formats, filesize, duration, resolution, api, pricing'
            })
          };
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseData)
    };
};

// 包括的エラーハンドリング付きのメインハンドラー
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await limitsHandlerCore(event);
    } catch (error) {
      return createErrorResponse(error, event.requestContext?.requestId);
    }
  },
  'limits-handler'
);

// システム制限情報の取得（要件5.1, 5.2, 5.3, 5.4）
async function getSystemLimits(): Promise<SystemLimits> {
  const maxFileSizeBytes = parseInt(process.env.MAX_FILE_SIZE_BYTES || '5368709120'); // 5GB
  const maxDurationSeconds = parseInt(process.env.MAX_DURATION_SECONDS || '7200'); // 2時間
  
  return {
    videoFormats: [
      {
        format: 'MP4',
        extension: '.mp4',
        description: 'MPEG-4 Part 14 - 最も一般的な動画形式',
        maxFileSize: '5GB',
        supported: true,
        notes: '推奨形式。最高の互換性とパフォーマンス'
      },
      {
        format: 'MOV',
        extension: '.mov',
        description: 'QuickTime Movie - Apple開発の動画形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'Apple製品で作成された動画に最適'
      },
      {
        format: 'AVI',
        extension: '.avi',
        description: 'Audio Video Interleave - Microsoft開発の形式',
        maxFileSize: '5GB',
        supported: true,
        notes: '古い形式だが広くサポートされている'
      },
      {
        format: 'MKV',
        extension: '.mkv',
        description: 'Matroska Video - オープンソースのコンテナ形式',
        maxFileSize: '5GB',
        supported: true,
        notes: '高品質動画に適している'
      },
      {
        format: 'WEBM',
        extension: '.webm',
        description: 'WebM - Web用に最適化された形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'Web配信に最適'
      },
      {
        format: 'MXF',
        extension: '.mxf',
        description: 'Material eXchange Format - プロ用形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'プロフェッショナル用途向け'
      },
      {
        format: 'FLV',
        extension: '.flv',
        description: 'Flash Video - Adobe Flash用形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'レガシー形式、新規作成は非推奨'
      },
      {
        format: 'WMV',
        extension: '.wmv',
        description: 'Windows Media Video - Microsoft形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'Windows環境で作成された動画'
      },
      {
        format: 'M4V',
        extension: '.m4v',
        description: 'iTunes Video - Apple iTunes用形式',
        maxFileSize: '5GB',
        supported: true,
        notes: 'iTunes/Apple TV用動画'
      }
    ],
    fileSizeLimits: {
      maxFileSizeBytes: maxFileSizeBytes,
      maxFileSizeDisplay: formatBytes(maxFileSizeBytes),
      recommendedMaxSize: '2GB（最適なパフォーマンスのため）',
      warningThreshold: '4GB（処理時間が長くなる可能性があります）'
    },
    videoLengthLimits: {
      maxDurationSeconds: maxDurationSeconds,
      maxDurationDisplay: formatDuration(maxDurationSeconds),
      recommendedMaxDuration: '30分（最適な解析品質のため）',
      processingTimeEstimate: '動画長の2-3倍の処理時間が必要です'
    },
    resolutionLimits: {
      maxWidth: 3840,
      maxHeight: 2160,
      maxPixels: 8294400, // 4K
      recommendedResolution: '1920x1080 (Full HD)',
      supportedAspectRatios: ['16:9', '4:3', '21:9', '1:1', '9:16']
    },
    apiLimits: {
      bedrockRateLimit: {
        requestsPerSecond: 2,
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        burstCapacity: 10
      },
      s3RateLimit: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
        requestsPerHour: 360000,
        burstCapacity: 1000
      },
      dynamoDbLimits: {
        readCapacityUnits: 1000,
        writeCapacityUnits: 1000,
        itemSizeLimit: '400KB',
        queryLimit: 1000
      },
      concurrentAnalyses: 5,
      dailyAnalysisLimit: 100
    },
    pricingInfo: {
      currency: 'USD',
      region: 'ap-northeast-1',
      s3Storage: {
        standardPerGB: 0.025,
        standardIAPerGB: 0.019,
        glacierPerGB: 0.004,
        requestsPer1000: 0.0004
      },
      dynamoDb: {
        readCapacityUnit: 0.000128,
        writeCapacityUnit: 0.000640,
        storagePerGB: 0.285
      },
      lambda: {
        requestsPer1M: 0.20,
        gbSecond: 0.0000166667
      },
      bedrock: {
        pegasusPerRequest: 0.10,
        estimatedRequestsPerAnalysis: 5
      },
      estimatedCostPerAnalysis: {
        minimum: 0.52, // 小さな動画
        typical: 0.75, // 一般的な動画
        maximum: 1.50, // 大きな動画
        breakdown: {
          s3: 0.05,
          dynamoDb: 0.02,
          lambda: 0.03,
          bedrock: 0.50
        }
      }
    },
    lastUpdated: new Date().toISOString()
  };
}

// バイト数を人間が読みやすい形式に変換
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

// 秒数を時間:分:秒形式に変換
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}時間${minutes}分${remainingSeconds}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    return `${remainingSeconds}秒`;
  }
}