/**
 * E2Eテストセットアップ
 * アップロードから結果表示までの完全フローテスト
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
// import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { v4 as uuidv4 } from 'uuid';

// モック用のUUID生成関数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// テスト環境設定
export const TEST_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  videoBucket: process.env.VIDEO_BUCKET_NAME || 'test-video-bucket',
  videoAnalysisTable: process.env.VIDEO_ANALYSIS_TABLE_NAME || 'test-video-analysis',
  queryHistoryTable: process.env.QUERY_HISTORY_TABLE_NAME || 'test-query-history',
  apiBaseUrl: process.env.API_BASE_URL || 'https://test-api.amazonaws.com/prod',
  timeout: {
    upload: 30000,      // 30秒
    analysis: 300000,   // 5分
    query: 60000,       // 1分
    status: 10000       // 10秒
  }
};

// テスト用クライアント（モック環境用）
export const testClients = {
  dynamoDb: DynamoDBDocumentClient.from(new DynamoDBClient({ region: TEST_CONFIG.region })),
  // s3: new S3Client({ region: TEST_CONFIG.region })
};

// テストデータ生成
export class TestDataGenerator {
  static generateVideoFile(sizeKB: number = 1024): Buffer {
    // テスト用の動画ファイルデータを生成（実際のMP4ヘッダー付き）
    const mp4Header = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
    ]);
    
    const remainingSize = (sizeKB * 1024) - mp4Header.length;
    const padding = Buffer.alloc(Math.max(0, remainingSize), 0);
    
    return Buffer.concat([mp4Header, padding]);
  }

  static generateUploadRequest(fileName: string = 'test-video.mp4', fileSize?: number): any {
    const actualSize = fileSize || 1024 * 1024; // 1MB default
    return {
      fileName,
      fileSize: actualSize,
      contentType: 'video/mp4',
      fileExtension: 'mp4'
    };
  }

  static generateAnalysisRequest(videoId: string): any {
    return {
      videoId
    };
  }

  static generateQueryRequest(videoId: string, question: string): any {
    return {
      videoId,
      question
    };
  }

  static generateAPIGatewayEvent(
    httpMethod: string,
    path: string,
    body?: any,
    queryStringParameters?: any
  ): APIGatewayProxyEvent {
    return {
      httpMethod,
      path,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://test.example.com'
      },
      multiValueHeaders: {},
      body: body ? JSON.stringify(body) : null,
      isBase64Encoded: false,
      pathParameters: null,
      queryStringParameters: queryStringParameters || null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod,
        path,
        stage: 'test',
        requestId: generateUUID(),
        requestTime: new Date().toISOString(),
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource',
        resourcePath: path,
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
          clientCert: null
        },
        authorizer: null
      },
      resource: path
    };
  }
}

// テストデータクリーンアップ
export class TestDataCleanup {
  static async cleanupDynamoDB(videoId: string): Promise<void> {
    try {
      // VideoAnalysisTable からクリーンアップ
      await testClients.dynamoDb.send(new DeleteCommand({
        TableName: TEST_CONFIG.videoAnalysisTable,
        Key: { videoId }
      }));

      // QueryHistoryTable からクリーンアップ
      const queryItems = await testClients.dynamoDb.send(new GetCommand({
        TableName: TEST_CONFIG.queryHistoryTable,
        Key: { videoId }
      }));

      if (queryItems.Item) {
        await testClients.dynamoDb.send(new DeleteCommand({
          TableName: TEST_CONFIG.queryHistoryTable,
          Key: { videoId }
        }));
      }
    } catch (error) {
      console.warn('DynamoDB cleanup warning:', error);
    }
  }

  static async cleanupS3(s3Key: string): Promise<void> {
    try {
      // S3クリーンアップはモック環境では実行しない
      console.log(`Mock S3 cleanup for key: ${s3Key}`);
    } catch (error) {
      console.warn('S3 cleanup warning:', error);
    }
  }

  static async cleanupAll(videoId: string, s3Key?: string): Promise<void> {
    await Promise.all([
      this.cleanupDynamoDB(videoId),
      s3Key ? this.cleanupS3(s3Key) : Promise.resolve()
    ]);
  }
}

// テスト結果検証ヘルパー
export class TestAssertions {
  static assertSuccessResponse(response: APIGatewayProxyResult, expectedStatusCode: number = 200): any {
    expect(response.statusCode).toBe(expectedStatusCode);
    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
    expect(response.body).toBeDefined();
    
    const body = JSON.parse(response.body);
    expect(body).not.toHaveProperty('error');
    return body;
  }

  static assertErrorResponse(
    response: APIGatewayProxyResult, 
    expectedStatusCode: number,
    expectedErrorType?: string
  ): any {
    expect(response.statusCode).toBe(expectedStatusCode);
    expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
    expect(response.body).toBeDefined();
    
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    
    if (expectedErrorType) {
      expect(body.error.type).toBe(expectedErrorType);
    }
    
    return body;
  }

  static assertUploadResponse(body: any): void {
    expect(body).toHaveProperty('videoId');
    expect(body).toHaveProperty('presignedUrl');
    expect(body).toHaveProperty('s3Key');
    expect(body).toHaveProperty('expiresIn');
    expect(body.videoId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(body.presignedUrl).toContain('https://');
    expect(body.s3Key).toContain('uploads/');
  }

  static assertAnalysisResponse(body: any): void {
    expect(body).toHaveProperty('videoId');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('result');
    expect(body.status).toBe('COMPLETED');
    
    const result = body.result;
    expect(result).toHaveProperty('basicAnalysis');
    expect(result).toHaveProperty('prTexts');
    expect(result).toHaveProperty('summaries');
    
    // PR文章の検証
    expect(result.prTexts).toHaveProperty('short');
    expect(result.prTexts).toHaveProperty('long');
    expect(result.prTexts.short.length).toBeLessThanOrEqual(200);
    expect(result.prTexts.long.length).toBeLessThanOrEqual(500);
    
    // あらすじの検証
    expect(result.summaries).toHaveProperty('short');
    expect(result.summaries).toHaveProperty('long');
    expect(result.summaries.short.length).toBeLessThanOrEqual(200);
    expect(result.summaries.long.length).toBeLessThanOrEqual(500);
  }

  static assertQueryResponse(body: any): void {
    expect(body).toHaveProperty('queryId');
    expect(body).toHaveProperty('question');
    expect(body).toHaveProperty('answer');
    expect(body).toHaveProperty('confidence');
    expect(body.queryId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(typeof body.answer).toBe('string');
    expect(body.answer.length).toBeGreaterThan(0);
    expect(typeof body.confidence).toBe('number');
    expect(body.confidence).toBeGreaterThanOrEqual(0);
    expect(body.confidence).toBeLessThanOrEqual(1);
  }

  static assertStatusResponse(body: any, expectedStatus?: string): void {
    expect(body).toHaveProperty('videoId');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('progress');
    expect(body).toHaveProperty('createdAt');
    expect(body).toHaveProperty('updatedAt');
    
    if (expectedStatus) {
      expect(body.status).toBe(expectedStatus);
    }
    
    expect(typeof body.progress).toBe('number');
    expect(body.progress).toBeGreaterThanOrEqual(0);
    expect(body.progress).toBeLessThanOrEqual(100);
  }

  static assertLimitsResponse(body: any): void {
    expect(body).toHaveProperty('videoFormats');
    expect(body).toHaveProperty('fileSizeLimits');
    expect(body).toHaveProperty('videoLengthLimits');
    expect(body).toHaveProperty('resolutionLimits');
    expect(body).toHaveProperty('apiLimits');
    expect(body).toHaveProperty('pricingInfo');
    expect(body).toHaveProperty('lastUpdated');
    
    expect(Array.isArray(body.videoFormats)).toBe(true);
    expect(body.videoFormats.length).toBeGreaterThan(0);
    
    expect(body.fileSizeLimits).toHaveProperty('maxFileSizeBytes');
    expect(body.fileSizeLimits).toHaveProperty('maxFileSizeDisplay');
    
    expect(body.apiLimits).toHaveProperty('bedrockRateLimit');
    expect(body.apiLimits).toHaveProperty('concurrentAnalyses');
  }
}

// パフォーマンス測定ヘルパー
export class PerformanceTracker {
  private startTime: number = 0;
  private measurements: Map<string, number> = new Map();

  start(): void {
    this.startTime = Date.now();
  }

  measure(label: string): number {
    const elapsed = Date.now() - this.startTime;
    this.measurements.set(label, elapsed);
    return elapsed;
  }

  getMeasurement(label: string): number | undefined {
    return this.measurements.get(label);
  }

  getAllMeasurements(): Map<string, number> {
    return new Map(this.measurements);
  }

  assertPerformance(label: string, maxTimeMs: number): void {
    const measurement = this.measurements.get(label);
    expect(measurement).toBeDefined();
    expect(measurement!).toBeLessThanOrEqual(maxTimeMs);
  }
}

// テスト用モックデータ
export const MOCK_ANALYSIS_RESULT = {
  basicAnalysis: {
    summary: 'テスト動画の基本解析結果です。この動画には様々な要素が含まれています。',
    scenes: ['オープニングシーン', 'メインコンテンツ', 'エンディング'],
    objects: ['人物', 'テキスト', '背景', 'ロゴ'],
    activities: ['話している', '画面操作', '移動']
  },
  prTexts: {
    short: 'この動画は興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。ぜひご覧ください。',
    long: 'この動画は非常に興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。詳細な解説と実践的なアドバイスが含まれており、初心者から上級者まで幅広い層に対応しています。ぜひ最後までご覧いただき、コメントやシェアもお願いします。'
  },
  summaries: {
    short: 'この動画では重要なトピックについて詳しく解説しています。実用的な内容が含まれており、視聴者の理解を深めることができます。',
    long: 'この動画では重要なトピックについて詳しく解説しています。まず基本概念から始まり、段階的に応用的な内容へと進んでいきます。実用的な例やケーススタディも豊富に含まれており、視聴者の理解を深めることができます。最後には今後の展望についても触れており、包括的な学習体験を提供しています。'
  }
};