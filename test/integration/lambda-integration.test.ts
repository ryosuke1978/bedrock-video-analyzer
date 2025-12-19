/**
 * Lambda関数統合テスト
 * 各Lambda関数の統合テスト
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// モック環境設定
const mockEnvironment = {
  REGION: 'ap-northeast-1',
  VIDEO_BUCKET_NAME: 'test-video-bucket',
  VIDEO_ANALYSIS_TABLE_NAME: 'test-video-analysis',
  QUERY_HISTORY_TABLE_NAME: 'test-query-history',
  NODE_ENV: 'test',
  ENABLE_MOCK: 'true',
  PEGASUS_MODEL_ID: 'twelvelabs.pegasus-1-2',
  PEGASUS_MODEL_VERSION: '1.0',
  MAX_FILE_SIZE_BYTES: '5368709120',
  MAX_DURATION_SECONDS: '7200'
};

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

describe('Lambda Integration Tests', () => {
  // 環境変数の設定
  beforeAll(() => {
    Object.keys(mockEnvironment).forEach(key => {
      process.env[key] = mockEnvironment[key as keyof typeof mockEnvironment];
    });
  });

  afterAll(() => {
    // 環境変数のクリーンアップ
    Object.keys(mockEnvironment).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Upload Lambda Integration', () => {
    // モックアップロードハンドラー
    const mockUploadHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        // CORS対応
        if (event.httpMethod === 'OPTIONS') {
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
          };
        }

        // リクエストボディの検証
        if (!event.body) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'リクエストボディが必要です' 
              } 
            })
          };
        }

        const request = JSON.parse(event.body);

        // 必須フィールドの検証
        if (!request.fileName || !request.fileSize) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'fileName と fileSize は必須です' 
              } 
            })
          };
        }

        // ファイル形式の検証
        const supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'flv', 'wmv', 'm4v'];
        const fileExtension = request.fileName.split('.').pop()?.toLowerCase();
        
        if (!fileExtension || !supportedFormats.includes(fileExtension)) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: '対応していないファイル形式です' 
              } 
            })
          };
        }

        // ファイルサイズの検証
        const maxFileSize = parseInt(process.env.MAX_FILE_SIZE_BYTES || '5368709120');
        if (request.fileSize > maxFileSize) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'ファイルサイズが制限を超えています' 
              } 
            })
          };
        }

        // 成功レスポンス
        const videoId = `test-video-${Date.now()}`;
        const s3Key = `uploads/${videoId}/${request.fileName}`;
        
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            presignedUrl: `https://${process.env.VIDEO_BUCKET_NAME}.s3.amazonaws.com/${s3Key}?signature=test`,
            s3Key,
            expiresIn: 3600
          })
        };

      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: { 
              type: 'INTERNAL_ERROR', 
              message: 'サーバー内部エラーが発生しました' 
            } 
          })
        };
      }
    };

    test('should handle valid upload request', async () => {
      const event = createMockEvent('POST', '/upload', {
        fileName: 'test-video.mp4',
        fileSize: 1024 * 1024,
        contentType: 'video/mp4'
      });

      const response = await mockUploadHandler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      
      const body = JSON.parse(response.body);
      expect(body.videoId).toBeDefined();
      expect(body.presignedUrl).toBeDefined();
      expect(body.s3Key).toBeDefined();
      expect(body.expiresIn).toBe(3600);
    });

    test('should reject invalid file format', async () => {
      const event = createMockEvent('POST', '/upload', {
        fileName: 'test-document.pdf',
        fileSize: 1024 * 1024,
        contentType: 'application/pdf'
      });

      const response = await mockUploadHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('対応していないファイル形式');
    });

    test('should reject oversized file', async () => {
      const event = createMockEvent('POST', '/upload', {
        fileName: 'huge-video.mp4',
        fileSize: 6 * 1024 * 1024 * 1024, // 6GB
        contentType: 'video/mp4'
      });

      const response = await mockUploadHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('ファイルサイズが制限を超えています');
    });

    test('should handle CORS preflight request', async () => {
      const event = createMockEvent('OPTIONS', '/upload');

      const response = await mockUploadHandler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(response.body).toBe('');
    });
  });

  describe('Analysis Lambda Integration', () => {
    // モック解析ハンドラー
    const mockAnalysisHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        if (!event.body) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'videoIdが必要です' 
              } 
            })
          };
        }

        const request = JSON.parse(event.body);

        if (!request.videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'videoIdが必要です' 
              } 
            })
          };
        }

        // モック解析結果
        const analysisResult = {
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

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: request.videoId,
            status: 'COMPLETED',
            result: analysisResult
          })
        };

      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: { 
              type: 'INTERNAL_ERROR', 
              message: 'サーバー内部エラーが発生しました' 
            } 
          })
        };
      }
    };

    test('should handle valid analysis request', async () => {
      const event = createMockEvent('POST', '/analysis', {
        videoId: 'test-video-123'
      });

      const response = await mockAnalysisHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.videoId).toBe('test-video-123');
      expect(body.status).toBe('COMPLETED');
      expect(body.result).toBeDefined();
      expect(body.result.basicAnalysis).toBeDefined();
      expect(body.result.prTexts).toBeDefined();
      expect(body.result.summaries).toBeDefined();

      // PR文章の長さ検証
      expect(body.result.prTexts.short.length).toBeLessThanOrEqual(200);
      expect(body.result.prTexts.long.length).toBeLessThanOrEqual(500);

      // あらすじの長さ検証
      expect(body.result.summaries.short.length).toBeLessThanOrEqual(200);
      expect(body.result.summaries.long.length).toBeLessThanOrEqual(500);

      // 日本語コンテンツの検証
      expect(body.result.prTexts.short).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
      expect(body.result.summaries.short).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
    });

    test('should reject missing videoId', async () => {
      const event = createMockEvent('POST', '/analysis', {});

      const response = await mockAnalysisHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('videoIdが必要です');
    });
  });

  describe('Query Lambda Integration', () => {
    // モック問い合わせハンドラー
    const mockQueryHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        if (!event.body) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'videoIdとquestionが必要です' 
              } 
            })
          };
        }

        const request = JSON.parse(event.body);

        if (!request.videoId || !request.question) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'videoIdとquestionが必要です' 
              } 
            })
          };
        }

        // 質問の長さ検証
        if (request.question.length > 1000) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: '質問は1000文字以下で入力してください' 
              } 
            })
          };
        }

        const queryId = `query-${Date.now()}`;
        const answer = `「${request.question}」についてお答えします。この動画では様々な要素が含まれており、詳細な解析結果を提供できます。`;

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryId,
            videoId: request.videoId,
            question: request.question,
            answer,
            confidence: 0.85,
            timeReferences: ['00:01:30', '00:03:45']
          })
        };

      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: { 
              type: 'INTERNAL_ERROR', 
              message: 'サーバー内部エラーが発生しました' 
            } 
          })
        };
      }
    };

    test('should handle valid query request', async () => {
      const event = createMockEvent('POST', '/query', {
        videoId: 'test-video-123',
        question: '動画の内容を教えてください'
      });

      const response = await mockQueryHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.queryId).toBeDefined();
      expect(body.videoId).toBe('test-video-123');
      expect(body.question).toBe('動画の内容を教えてください');
      expect(body.answer).toBeDefined();
      expect(body.confidence).toBeGreaterThan(0);
      expect(body.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(body.timeReferences)).toBe(true);

      // 日本語回答の検証
      expect(body.answer).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
    });

    test('should reject long question', async () => {
      const longQuestion = 'あ'.repeat(1001); // 1001文字

      const event = createMockEvent('POST', '/query', {
        videoId: 'test-video-123',
        question: longQuestion
      });

      const response = await mockQueryHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('1000文字以下');
    });
  });

  describe('Status Lambda Integration', () => {
    // モックステータスハンドラー
    const mockStatusHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        const videoId = event.queryStringParameters?.videoId;

        if (!videoId) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: { 
                type: 'VALIDATION_ERROR', 
                message: 'videoIdクエリパラメータが必要です' 
              } 
            })
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

      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: { 
              type: 'INTERNAL_ERROR', 
              message: 'サーバー内部エラーが発生しました' 
            } 
          })
        };
      }
    };

    test('should handle valid status request', async () => {
      const event = createMockEvent('GET', '/status', null, { videoId: 'test-video-123' });

      const response = await mockStatusHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.videoId).toBe('test-video-123');
      expect(body.status).toBe('COMPLETED');
      expect(body.progress).toBe(100);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    test('should reject missing videoId parameter', async () => {
      const event = createMockEvent('GET', '/status');

      const response = await mockStatusHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('videoIdクエリパラメータが必要です');
    });
  });

  describe('Limits Lambda Integration', () => {
    // モック制限情報ハンドラー
    const mockLimitsHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        const section = event.queryStringParameters?.section;

        const limitsData = {
          videoFormats: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM', 'MXF', 'FLV', 'WMV', 'M4V'],
          fileSizeLimits: {
            maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '5368709120'),
            maxFileSizeDisplay: '5GB'
          },
          videoLengthLimits: {
            maxDurationSeconds: parseInt(process.env.MAX_DURATION_SECONDS || '7200'),
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
        };

        // セクション指定がある場合
        if (section) {
          const validSections = ['formats', 'filesize', 'duration', 'resolution', 'api', 'pricing'];
          if (!validSections.includes(section)) {
            return {
              statusCode: 400,
              headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                error: { 
                  type: 'VALIDATION_ERROR', 
                  message: `Valid sections: ${validSections.join(', ')}` 
                } 
              })
            };
          }

          // セクション別データ
          const sectionData: any = {
            formats: { videoFormats: limitsData.videoFormats },
            filesize: { fileSizeLimits: limitsData.fileSizeLimits },
            duration: { videoLengthLimits: limitsData.videoLengthLimits },
            resolution: { resolutionLimits: limitsData.resolutionLimits },
            api: { apiLimits: limitsData.apiLimits },
            pricing: { pricingInfo: limitsData.pricingInfo }
          };

          return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(sectionData[section])
          };
        }

        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify(limitsData)
        };

      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: { 
              type: 'INTERNAL_ERROR', 
              message: 'サーバー内部エラーが発生しました' 
            } 
          })
        };
      }
    };

    test('should return all limits information', async () => {
      const event = createMockEvent('GET', '/limits');

      const response = await mockLimitsHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.videoFormats).toBeDefined();
      expect(Array.isArray(body.videoFormats)).toBe(true);
      expect(body.fileSizeLimits).toBeDefined();
      expect(body.videoLengthLimits).toBeDefined();
      expect(body.resolutionLimits).toBeDefined();
      expect(body.apiLimits).toBeDefined();
      expect(body.pricingInfo).toBeDefined();
      expect(body.lastUpdated).toBeDefined();
    });

    test('should return section-specific information', async () => {
      const event = createMockEvent('GET', '/limits', null, { section: 'formats' });

      const response = await mockLimitsHandler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      expect(body.videoFormats).toBeDefined();
      expect(Array.isArray(body.videoFormats)).toBe(true);
      expect(body.videoFormats.length).toBeGreaterThan(0);
    });

    test('should reject invalid section', async () => {
      const event = createMockEvent('GET', '/limits', null, { section: 'invalid' });

      const response = await mockLimitsHandler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.type).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Valid sections:');
    });
  });

  describe('Cross-Lambda Integration', () => {
    test('should maintain data consistency across lambda functions', async () => {
      // 1. アップロード
      const uploadEvent = createMockEvent('POST', '/upload', {
        fileName: 'integration-test.mp4',
        fileSize: 1024 * 1024
      });

      const mockUploadHandler = async (event: APIGatewayProxyEvent) => {
        const request = JSON.parse(event.body || '{}');
        const videoId = `integration-test-${Date.now()}`;
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            presignedUrl: `https://test-bucket.s3.amazonaws.com/uploads/${videoId}/${request.fileName}`,
            s3Key: `uploads/${videoId}/${request.fileName}`,
            expiresIn: 3600
          })
        };
      };

      const uploadResponse = await mockUploadHandler(uploadEvent);
      expect(uploadResponse.statusCode).toBe(200);
      
      const uploadBody = JSON.parse(uploadResponse.body);
      const videoId = uploadBody.videoId;

      // 2. 解析
      const analysisEvent = createMockEvent('POST', '/analysis', { videoId });
      
      const mockAnalysisHandler = async (event: APIGatewayProxyEvent) => {
        const request = JSON.parse(event.body || '{}');
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: request.videoId,
            status: 'COMPLETED',
            result: {
              basicAnalysis: { summary: 'テスト解析結果' },
              prTexts: { short: 'テストPR文章', long: 'テスト長いPR文章' },
              summaries: { short: 'テストあらすじ', long: 'テスト長いあらすじ' }
            }
          })
        };
      };

      const analysisResponse = await mockAnalysisHandler(analysisEvent);
      expect(analysisResponse.statusCode).toBe(200);
      
      const analysisBody = JSON.parse(analysisResponse.body);
      expect(analysisBody.videoId).toBe(videoId);

      // 3. ステータス確認
      const statusEvent = createMockEvent('GET', '/status', null, { videoId });
      
      const mockStatusHandler = async (event: APIGatewayProxyEvent) => {
        const queryVideoId = event.queryStringParameters?.videoId;
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: queryVideoId,
            status: 'COMPLETED',
            progress: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        };
      };

      const statusResponse = await mockStatusHandler(statusEvent);
      expect(statusResponse.statusCode).toBe(200);
      
      const statusBody = JSON.parse(statusResponse.body);
      expect(statusBody.videoId).toBe(videoId);
      expect(statusBody.status).toBe('COMPLETED');

      // 4. 問い合わせ
      const queryEvent = createMockEvent('POST', '/query', {
        videoId,
        question: '動画の内容を教えてください'
      });
      
      const mockQueryHandler = async (event: APIGatewayProxyEvent) => {
        const request = JSON.parse(event.body || '{}');
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryId: `query-${Date.now()}`,
            videoId: request.videoId,
            question: request.question,
            answer: 'テスト回答',
            confidence: 0.85,
            timeReferences: ['00:01:30']
          })
        };
      };

      const queryResponse = await mockQueryHandler(queryEvent);
      expect(queryResponse.statusCode).toBe(200);
      
      const queryBody = JSON.parse(queryResponse.body);
      expect(queryBody.videoId).toBe(videoId);

      // データ整合性の確認
      expect(uploadBody.videoId).toBe(analysisBody.videoId);
      expect(analysisBody.videoId).toBe(statusBody.videoId);
      expect(statusBody.videoId).toBe(queryBody.videoId);
    });
  });
});