import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  VideoAnalyzerError, 
  ErrorType, 
  createErrorResponse, 
  withErrorHandling,
  retryWithExponentialBackoff,
  DEFAULT_RETRY_CONFIG
} from './utils/error-handler';

const s3Client = new S3Client({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// 対応フォーマットの定義（要件1.1に基づく）
const SUPPORTED_FORMATS = {
  'mp4': ['video/mp4', 'application/mp4'],
  'mov': ['video/quicktime', 'video/mov'],
  'avi': ['video/avi', 'video/x-msvideo', 'video/msvideo'],
  'mkv': ['video/x-matroska', 'video/mkv'],
  'webm': ['video/webm'],
  'mxf': ['application/mxf', 'application/x-mxf'],
  'flv': ['video/x-flv', 'video/flv'],
  'wmv': ['video/x-ms-wmv', 'video/wmv'],
  'm4v': ['video/x-m4v', 'video/mp4']
};

// ファイルサイズ制限（要件1.2に基づく）
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILE_SIZE = 1024; // 1KB（破損ファイル検出）

// ファイル名の最大長
const MAX_FILENAME_LENGTH = 255;

// 検証結果の型定義
interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

// リクエストボディの型定義
interface UploadRequest {
  fileName: string;
  fileSize: number;
  contentType?: string;
  fileExtension?: string;
}

/**
 * ファイルの包括的検証
 */
function validateVideoFile(request: UploadRequest): ValidationResult {
  const { fileName, fileSize, contentType, fileExtension } = request;

  // ファイル名の検証
  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: 'ファイル名が指定されていません' };
  }

  if (fileName.length > MAX_FILENAME_LENGTH) {
    return { 
      isValid: false, 
      error: `ファイル名が長すぎます（最大${MAX_FILENAME_LENGTH}文字）`,
      details: { currentLength: fileName.length, maxLength: MAX_FILENAME_LENGTH }
    };
  }

  // 危険な文字のチェック
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return { 
      isValid: false, 
      error: 'ファイル名に使用できない文字が含まれています' 
    };
  }

  // ファイル拡張子の検証
  const extension = fileExtension || fileName.split('.').pop()?.toLowerCase();
  if (!extension) {
    return { isValid: false, error: 'ファイル拡張子が見つかりません' };
  }

  if (!Object.keys(SUPPORTED_FORMATS).includes(extension)) {
    return { 
      isValid: false, 
      error: '対応していないファイル形式です',
      details: { 
        provided: extension,
        supported: Object.keys(SUPPORTED_FORMATS)
      }
    };
  }

  // MIMEタイプの検証（提供されている場合）
  if (contentType) {
    const expectedMimeTypes = SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS];
    if (!expectedMimeTypes.includes(contentType)) {
      return { 
        isValid: false, 
        error: 'ファイルの内容が拡張子と一致しません',
        details: { 
          providedMimeType: contentType,
          expectedMimeTypes: expectedMimeTypes
        }
      };
    }
  }

  // ファイルサイズの検証
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return { isValid: false, error: '有効なファイルサイズが指定されていません' };
  }

  if (fileSize < MIN_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'ファイルが小さすぎます。有効な動画ファイルを選択してください',
      details: { currentSize: fileSize, minSize: MIN_FILE_SIZE }
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'ファイルサイズが制限を超えています',
      details: { 
        currentSize: fileSize, 
        maxSize: MAX_FILE_SIZE,
        currentSizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
        maxSizeMB: Math.round(MAX_FILE_SIZE / (1024 * 1024))
      }
    };
  }

  return { isValid: true };
}

/**
 * ウイルススキャンのモック実装（要件9.1）
 * 実際の実装では AWS GuardDuty Malware Protection や ClamAV を使用
 */
async function performVirusScan(fileName: string, fileSize: number): Promise<ValidationResult> {
  // 実際の実装では外部のウイルススキャンサービスを呼び出し
  console.log(`Performing virus scan for file: ${fileName}, size: ${fileSize}`);
  
  // 疑わしいファイル名パターンのチェック（基本的なヒューリスティック）
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /malware/i,
    /virus/i,
    /trojan/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileName)) {
      return { 
        isValid: false, 
        error: 'セキュリティ上の理由によりファイルがブロックされました',
        details: { reason: 'suspicious_filename_pattern' }
      };
    }
  }

  // ファイルサイズベースの簡易チェック
  if (fileSize > 500 * 1024 * 1024) { // 500MB以上は要注意
    console.warn(`Large file detected: ${fileName}, size: ${fileSize}`);
  }

  // モック：常に安全として扱う（実際の実装では外部サービスの結果を使用）
  return { isValid: true };
}

/**
 * S3キーの生成（セキュアなパス）
 */
function generateS3Key(videoId: string, fileName: string): string {
  // ファイル名をサニタイズ
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100); // ファイル名を100文字に制限

  return `uploads/${videoId}/${sanitizedFileName}`;
}

/**
 * DynamoDBメタデータの作成
 */
function createVideoMetadata(videoId: string, request: UploadRequest, s3Key: string) {
  const now = new Date().toISOString();
  const extension = request.fileExtension || request.fileName.split('.').pop()?.toLowerCase();

  return {
    videoId,
    uploadTimestamp: Date.now(),
    fileName: request.fileName,
    fileSize: request.fileSize,
    duration: null, // 解析後に更新
    format: extension,
    s3Key,
    status: 'UPLOADED',
    progress: 0,
    basicAnalysis: null,
    prTexts: null,
    summaries: null,
    createdAt: now,
    updatedAt: now,
    // セキュリティ関連メタデータ
    virusScanStatus: 'PASSED',
    virusScanTimestamp: now,
    // ファイル検証メタデータ
    validationStatus: 'PASSED',
    validationTimestamp: now
  };
}

// メインハンドラー（包括的エラーハンドリング付き）
const uploadHandlerCore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Upload request received:', JSON.stringify(event, null, 2));

    // CORS ヘッダー
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Content-Type': 'application/json'
    };

    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // リクエストボディの検証
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'リクエストボディが必要です',
          code: 'MISSING_BODY'
        })
      };
    }

    let requestData: UploadRequest;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: '無効なJSONフォーマットです',
          code: 'INVALID_JSON'
        })
      };
    }

    // 必須フィールドの検証
    if (!requestData.fileName || !requestData.fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'fileName と fileSize は必須です',
          code: 'MISSING_REQUIRED_FIELDS'
        })
      };
    }

    console.log('Processing upload request:', {
      fileName: requestData.fileName,
      fileSize: requestData.fileSize,
      contentType: requestData.contentType
    });

    // ファイル検証
    const validationResult = validateVideoFile(requestData);
    if (!validationResult.isValid) {
      console.warn('File validation failed:', validationResult);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: validationResult.error,
          details: validationResult.details,
          code: 'VALIDATION_FAILED'
        })
      };
    }

    // ウイルススキャン（要件9.1）
    const virusScanResult = await performVirusScan(requestData.fileName, requestData.fileSize);
    if (!virusScanResult.isValid) {
      console.error('Virus scan failed:', virusScanResult);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: virusScanResult.error,
          details: virusScanResult.details,
          code: 'SECURITY_BLOCKED'
        })
      };
    }

    // 一意のビデオIDを生成
    const videoId = uuidv4();
    const s3Key = generateS3Key(videoId, requestData.fileName);

    console.log('Generated video ID and S3 key:', { videoId, s3Key });

    // プリサインドURL生成（要件1.4）
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.VIDEO_BUCKET_NAME,
      Key: s3Key,
      ContentType: requestData.contentType || 'application/octet-stream',
      // セキュリティヘッダー
      ServerSideEncryption: 'AES256',
      // メタデータ
      Metadata: {
        'video-id': videoId,
        'original-filename': requestData.fileName,
        'upload-timestamp': Date.now().toString(),
        'validation-status': 'passed',
        'virus-scan-status': 'passed'
      }
    });

    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, { 
      expiresIn: 3600 // 1時間の有効期限
    });

    // DynamoDBにメタデータ保存（要件1.4）
    const metadata = createVideoMetadata(videoId, requestData, s3Key);
    
    const putCommand = new PutCommand({
      TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
      Item: metadata,
      // 条件付き書き込み（重複防止）
      ConditionExpression: 'attribute_not_exists(videoId)'
    });

    await docClient.send(putCommand);

    console.log('Successfully created upload session:', { videoId, s3Key });

    // 成功レスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoId,
        presignedUrl,
        s3Key,
        expiresIn: 3600,
        message: 'アップロード準備が完了しました',
        metadata: {
          fileName: requestData.fileName,
          fileSize: requestData.fileSize,
          format: requestData.fileExtension || requestData.fileName.split('.').pop()?.toLowerCase(),
          maxFileSize: MAX_FILE_SIZE,
          supportedFormats: Object.keys(SUPPORTED_FORMATS)
        }
      })
    };

  // CORS ヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // リクエストボディの検証
  if (!event.body) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      'リクエストボディが必要です',
      400,
      false,
      { code: 'MISSING_BODY' }
    );
  }

  let requestData: UploadRequest;
  try {
    requestData = JSON.parse(event.body);
  } catch (parseError) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      '無効なJSONフォーマットです',
      400,
      false,
      { code: 'INVALID_JSON' }
    );
  }

  // 必須フィールドの検証
  if (!requestData.fileName || !requestData.fileSize) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      'fileName と fileSize は必須です',
      400,
      false,
      { code: 'MISSING_REQUIRED_FIELDS' }
    );
  }

  // ファイル検証
  const validationResult = validateVideoFile(requestData);
  if (!validationResult.isValid) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      validationResult.error!,
      400,
      false,
      { ...validationResult.details, code: 'VALIDATION_FAILED' }
    );
  }

  // ウイルススキャン（リトライ付き）
  const virusScanResult = await retryWithExponentialBackoff(
    () => performVirusScan(requestData.fileName, requestData.fileSize),
    DEFAULT_RETRY_CONFIG,
    'virus-scan'
  );

  if (!virusScanResult.isValid) {
    throw new VideoAnalyzerError(
      ErrorType.AUTHORIZATION_ERROR,
      virusScanResult.error!,
      403,
      false,
      { ...virusScanResult.details, code: 'SECURITY_BLOCKED' }
    );
  }

  // S3プリサインドURL生成（リトライ付き）
  const videoId = uuidv4();
  const s3Key = `uploads/${videoId}/${requestData.fileName}`;

  const presignedUrl = await retryWithExponentialBackoff(
    async () => {
      const command = new PutObjectCommand({
        Bucket: process.env.VIDEO_BUCKET_NAME!,
        Key: s3Key,
        ContentType: requestData.contentType || 'application/octet-stream',
        ContentLength: requestData.fileSize,
        Metadata: {
          originalFileName: requestData.fileName,
          uploadedAt: new Date().toISOString(),
          videoId: videoId
        }
      });

      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    },
    DEFAULT_RETRY_CONFIG,
    's3-presigned-url'
  );

  // DynamoDBにメタデータ保存（リトライ付き）
  const videoMetadata = createVideoMetadata(videoId, s3Key, requestData);
  
  await retryWithExponentialBackoff(
    async () => {
      const command = new PutCommand({
        TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME!,
        Item: videoMetadata
      });

      await docClient.send(command);
    },
    DEFAULT_RETRY_CONFIG,
    'dynamodb-put'
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      videoId,
      presignedUrl,
      s3Key,
      expiresIn: 3600,
      message: 'アップロード準備が完了しました',
      metadata: {
        fileName: requestData.fileName,
        fileSize: requestData.fileSize,
        format: requestData.fileExtension || requestData.fileName.split('.').pop()?.toLowerCase(),
        maxFileSize: MAX_FILE_SIZE,
        supportedFormats: Object.keys(SUPPORTED_FORMATS)
      }
    })
  };
};

// 包括的エラーハンドリング付きのメインハンドラー
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await uploadHandlerCore(event);
    } catch (error) {
      return createErrorResponse(error, event.requestContext?.requestId);
    }
  },
  'upload-handler'
);