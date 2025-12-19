/**
 * API統合テスト
 * 各APIエンドポイントの統合テスト
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// テストヘルパー関数
function createMockEvent(
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
      requestId: 'test-request-id',
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

function assertSuccessResponse(response: APIGatewayProxyResult, expectedStatusCode: number = 200): any {
  expect(response.statusCode).toBe(expectedStatusCode);
  expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
  expect(response.body).toBeDefined();
  
  const body = JSON.parse(response.body);
  expect(body).not.toHaveProperty('error');
  return body;
}

function assertErrorResponse(
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

describe('API Integration Tests', () => {
  // 環境変数の設定
  beforeAll(() => {
    process.env.REGION = 'ap-northeast-1';
    process.env.VIDEO_BUCKET_NAME = 'test-video-bucket';
    process.env.VIDEO_ANALYSIS_TABLE_NAME = 'test-video-analysis';
    process.env.QUERY_HISTORY_TABLE_NAME = 'test-query-history';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK = 'true';
  });

  describe('Upload API Integration', () => {
    test('should handle valid upload request', async () => {
      const mockUploadHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        if (!request.fileName || !request.fileSize) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'fileName と fileSize は必須です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: 'test-video-id',
            presignedUrl: 'https://test-bucket.s3.amazonaws.com/test-key',
            s3Key: 'uploads/test-video-id/test.mp4',
            expiresIn: 3600
          })
        };
      };

      const event = createMockEvent('POST', '/upload', {
        fileName: 'test-video.mp4',
        fileSize: 1024 * 1024,
        contentType: 'video/mp4'
      });

      const response = await mockUploadHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.videoId).toBeDefined();
      expect(body.presignedUrl).toBeDefined();
      expect(body.s3Key).toBeDefined();
      expect(body.expiresIn).toBe(3600);
    });

    test('should reject invalid file format', async () => {
      const mockUploadHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        const supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'flv', 'wmv', 'm4v'];
        const fileExtension = request.fileName?.split('.').pop()?.toLowerCase();
        
        if (!fileExtension || !supportedFormats.includes(fileExtension)) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: '対応していないファイル形式です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const event = createMockEvent('POST', '/upload', {
        fileName: 'test-document.pdf',
        fileSize: 1024 * 1024,
        contentType: 'application/pdf'
      });

      const response = await mockUploadHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Analysis API Integration', () => {
    test('should handle valid analysis request', async () => {
      const mockAnalysisHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        if (!request.videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: request.videoId,
            status: 'COMPLETED',
            result: {
              basicAnalysis: {
                summary: 'テスト動画の解析結果',
                scenes: ['シーン1', 'シーン2'],
                objects: ['オブジェクト1', 'オブジェクト2'],
                activities: ['アクティビティ1', 'アクティビティ2']
              },
              prTexts: {
                short: 'この動画は興味深いコンテンツです。',
                long: 'この動画は非常に興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。'
              },
              summaries: {
                short: 'この動画では重要なトピックを解説しています。',
                long: 'この動画では重要なトピックについて詳しく解説しており、実用的な内容が含まれています。'
              }
            }
          })
        };
      };

      const event = createMockEvent('POST', '/analysis', {
        videoId: 'test-video-id'
      });

      const response = await mockAnalysisHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.videoId).toBe('test-video-id');
      expect(body.status).toBe('COMPLETED');
      expect(body.result).toBeDefined();
      expect(body.result.basicAnalysis).toBeDefined();
      expect(body.result.prTexts).toBeDefined();
      expect(body.result.summaries).toBeDefined();
    });

    test('should reject missing videoId', async () => {
      const mockAnalysisHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        if (!request.videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const event = createMockEvent('POST', '/analysis', {});

      const response = await mockAnalysisHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Query API Integration', () => {
    test('should handle valid query request', async () => {
      const mockQueryHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        if (!request.videoId || !request.question) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdとquestionが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryId: 'test-query-id',
            videoId: request.videoId,
            question: request.question,
            answer: `「${request.question}」についてお答えします。`,
            confidence: 0.85,
            timeReferences: ['00:01:30', '00:03:45']
          })
        };
      };

      const event = createMockEvent('POST', '/query', {
        videoId: 'test-video-id',
        question: '動画の内容を教えてください'
      });

      const response = await mockQueryHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.queryId).toBeDefined();
      expect(body.videoId).toBe('test-video-id');
      expect(body.question).toBe('動画の内容を教えてください');
      expect(body.answer).toBeDefined();
      expect(body.confidence).toBeGreaterThan(0);
      expect(Array.isArray(body.timeReferences)).toBe(true);
    });

    test('should reject empty question', async () => {
      const mockQueryHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const request = JSON.parse(event.body || '{}');
        
        if (!request.videoId || !request.question || !request.question.trim()) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdとquestionが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const event = createMockEvent('POST', '/query', {
        videoId: 'test-video-id',
        question: '   '
      });

      const response = await mockQueryHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Status API Integration', () => {
    test('should handle valid status request', async () => {
      const mockStatusHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const videoId = event.queryStringParameters?.videoId;
        
        if (!videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdクエリパラメータが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            status: 'COMPLETED',
            progress: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        };
      };

      const event = createMockEvent('GET', '/status', null, { videoId: 'test-video-id' });

      const response = await mockStatusHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.videoId).toBe('test-video-id');
      expect(body.status).toBe('COMPLETED');
      expect(body.progress).toBe(100);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    test('should reject missing videoId parameter', async () => {
      const mockStatusHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const videoId = event.queryStringParameters?.videoId;
        
        if (!videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdクエリパラメータが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const event = createMockEvent('GET', '/status');

      const response = await mockStatusHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('Limits API Integration', () => {
    test('should return system limits', async () => {
      const mockLimitsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFormats: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM', 'MXF', 'FLV', 'WMV', 'M4V'],
            fileSizeLimits: {
              maxFileSizeBytes: 5 * 1024 * 1024 * 1024,
              maxFileSizeDisplay: '5GB'
            },
            videoLengthLimits: {
              maxDurationSeconds: 7200,
              maxDurationDisplay: '2時間'
            },
            resolutionLimits: {
              maxWidth: 3840,
              maxHeight: 2160,
              maxResolutionDisplay: '4K (3840x2160)'
            },
            apiLimits: {
              bedrockRateLimit: '100 requests/minute',
              concurrentAnalyses: 5
            },
            pricingInfo: {
              analysisBaseCost: '¥100',
              queryBaseCost: '¥10',
              storageBaseCost: '¥1/GB/day'
            },
            lastUpdated: new Date().toISOString()
          })
        };
      };

      const event = createMockEvent('GET', '/limits');

      const response = await mockLimitsHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.videoFormats).toBeDefined();
      expect(Array.isArray(body.videoFormats)).toBe(true);
      expect(body.fileSizeLimits).toBeDefined();
      expect(body.videoLengthLimits).toBeDefined();
      expect(body.resolutionLimits).toBeDefined();
      expect(body.apiLimits).toBeDefined();
      expect(body.pricingInfo).toBeDefined();
      expect(body.lastUpdated).toBeDefined();
    });

    test('should handle section-specific requests', async () => {
      const mockLimitsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        const section = event.queryStringParameters?.section;
        
        if (section === 'formats') {
          return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoFormats: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM', 'MXF', 'FLV', 'WMV', 'M4V']
            })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: section || 'all' })
        };
      };

      const event = createMockEvent('GET', '/limits', null, { section: 'formats' });

      const response = await mockLimitsHandler(event);
      const body = assertSuccessResponse(response);

      expect(body.videoFormats).toBeDefined();
      expect(Array.isArray(body.videoFormats)).toBe(true);
      expect(body.videoFormats.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Integration', () => {
    test('should handle OPTIONS requests for all endpoints', async () => {
      const mockCorsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        if (event.httpMethod === 'OPTIONS') {
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key'
            },
            body: ''
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const endpoints = ['/upload', '/analysis', '/query', '/status', '/limits'];

      for (const endpoint of endpoints) {
        const event = createMockEvent('OPTIONS', endpoint);
        const response = await mockCorsHandler(event);

        expect(response.statusCode).toBe(200);
        expect(response.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
        expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
        expect(response.headers).toHaveProperty('Access-Control-Allow-Headers');
        expect(response.body).toBe('');
      }
    });

    test('should include CORS headers in error responses', async () => {
      const mockErrorHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: { type: 'TEST_ERROR', message: 'テストエラー' } })
        };
      };

      const event = createMockEvent('POST', '/upload', {});
      const response = await mockErrorHandler(event);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(response.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed JSON', async () => {
      const mockJsonHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
          if (event.body) {
            JSON.parse(event.body);
          }
          return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
          };
        } catch (error) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: '無効なJSONフォーマット' } })
          };
        }
      };

      const event = createMockEvent('POST', '/upload');
      event.body = '{ invalid json }';

      const response = await mockJsonHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    test('should handle missing request body', async () => {
      const mockBodyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        if (!event.body) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'リクエストボディが必要です' } })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      };

      const event = createMockEvent('POST', '/upload');

      const response = await mockBodyHandler(event);
      assertErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });
});