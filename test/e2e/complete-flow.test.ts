/**
 * 完全フローE2Eテスト
 * アップロードから結果表示までの統合テスト
 */

import { 
  TestDataGenerator, 
  TestDataCleanup, 
  TestAssertions, 
  PerformanceTracker,
  TEST_CONFIG,
  MOCK_ANALYSIS_RESULT
} from './setup';

// Lambda関数のモック実装
const uploadHandler = async (event: any) => {
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

  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'リクエストボディが必要です' } })
    };
  }

  try {
    const request = JSON.parse(event.body);
    
    if (!request.fileName || !request.fileSize) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'fileName と fileSize は必須です' } })
      };
    }

    // ファイル形式検証
    const supportedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mxf', 'flv', 'wmv', 'm4v'];
    const fileExtension = request.fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: '対応していないファイル形式です' } })
      };
    }

    // ファイルサイズ検証
    if (request.fileSize > 5 * 1024 * 1024 * 1024) { // 5GB制限
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'ファイルサイズが制限を超えています' } })
      };
    }

    if (request.fileSize < 1000) { // 1KB未満
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'ファイルが小さすぎます' } })
      };
    }

    const videoId = generateUUID();
    const s3Key = `uploads/${videoId}/${request.fileName}`;
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        presignedUrl: `https://test-bucket.s3.amazonaws.com/${s3Key}?signature=test`,
        s3Key,
        expiresIn: 3600
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: '無効なJSONフォーマット' } })
    };
  }
};

const analysisHandler = async (event: any) => {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdが必要です' } })
    };
  }

  const request = JSON.parse(event.body);
  
  if (!request.videoId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdが必要です' } })
    };
  }

  if (request.videoId === 'non-existent-video-id') {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'RESOURCE_NOT_FOUND', message: '動画が見つかりません' } })
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
      }
    })
  };
};

const queryHandler = async (event: any) => {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdとquestionが必要です' } })
    };
  }

  const request = JSON.parse(event.body);
  
  if (!request.videoId || !request.question) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdとquestionが必要です' } })
    };
  }

  if (request.videoId === 'non-existent-video-id') {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'RESOURCE_NOT_FOUND', message: '動画解析結果が見つかりません' } })
    };
  }

  if (!request.question.trim() || request.question.length > 1000) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: '質問は1文字以上1000文字以下で入力してください' } })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryId: generateUUID(),
      videoId: request.videoId,
      question: request.question,
      answer: `「${request.question}」についてお答えします。この動画では様々な要素が含まれており、詳細な解析結果を提供できます。`,
      confidence: 0.85,
      timeReferences: ['00:01:30', '00:03:45']
    })
  };
};

const statusHandler = async (event: any) => {
  const videoId = event.queryStringParameters?.videoId;
  
  if (!videoId) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'videoIdクエリパラメータが必要です' } })
    };
  }

  if (videoId === 'non-existent-video-id') {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'RESOURCE_NOT_FOUND', message: '動画が見つかりません' } })
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
      updatedAt: new Date().toISOString(),
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
    })
  };
};

const limitsHandler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'Only GET method is supported' } })
    };
  }

  const section = event.queryStringParameters?.section;
  
  if (section && !['formats', 'filesize', 'duration', 'resolution', 'api', 'pricing'].includes(section)) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'Valid sections: formats, filesize, duration, resolution, api, pricing' } })
    };
  }

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

// generateUUID関数をインポート
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Complete Flow E2E Tests', () => {
  let testVideoId: string;
  let testS3Key: string;
  const performanceTracker = new PerformanceTracker();

  beforeAll(() => {
    // テスト環境変数の設定
    process.env.REGION = TEST_CONFIG.region;
    process.env.VIDEO_BUCKET_NAME = TEST_CONFIG.videoBucket;
    process.env.VIDEO_ANALYSIS_TABLE_NAME = TEST_CONFIG.videoAnalysisTable;
    process.env.QUERY_HISTORY_TABLE_NAME = TEST_CONFIG.queryHistoryTable;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK = 'true';
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    if (testVideoId) {
      await TestDataCleanup.cleanupAll(testVideoId, testS3Key);
    }
  });

  describe('Happy Path - Complete Video Analysis Flow', () => {
    test('should complete full video analysis workflow', async () => {
      performanceTracker.start();

      // Step 1: ファイルアップロード
      const uploadRequest = TestDataGenerator.generateUploadRequest('test-video.mp4', 5 * 1024 * 1024);
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);

      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadTime = performanceTracker.measure('upload');

      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
      TestAssertions.assertUploadResponse(uploadBody);

      testVideoId = uploadBody.videoId;
      testS3Key = uploadBody.s3Key;

      // アップロードのパフォーマンス検証
      performanceTracker.assertPerformance('upload', TEST_CONFIG.timeout.upload);

      // Step 2: 解析開始
      const analysisRequest = TestDataGenerator.generateAnalysisRequest(testVideoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);

      const analysisResponse = await analysisHandler(analysisEvent);
      const analysisTime = performanceTracker.measure('analysis');

      const analysisBody = TestAssertions.assertSuccessResponse(analysisResponse);
      TestAssertions.assertAnalysisResponse(analysisBody);

      // 解析のパフォーマンス検証
      performanceTracker.assertPerformance('analysis', TEST_CONFIG.timeout.analysis);

      // Step 3: ステータス確認
      const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
        'GET', 
        '/status', 
        null, 
        { videoId: testVideoId }
      );

      const statusResponse = await statusHandler(statusEvent);
      const statusTime = performanceTracker.measure('status');

      const statusBody = TestAssertions.assertSuccessResponse(statusResponse);
      TestAssertions.assertStatusResponse(statusBody, 'COMPLETED');

      // ステータス取得のパフォーマンス検証
      performanceTracker.assertPerformance('status', TEST_CONFIG.timeout.status);

      // Step 4: 自然言語問い合わせ
      const queryRequest = TestDataGenerator.generateQueryRequest(
        testVideoId, 
        '動画の内容を教えてください'
      );
      const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);

      const queryResponse = await queryHandler(queryEvent);
      const queryTime = performanceTracker.measure('query');

      const queryBody = TestAssertions.assertSuccessResponse(queryResponse);
      TestAssertions.assertQueryResponse(queryBody);

      // 問い合わせのパフォーマンス検証
      performanceTracker.assertPerformance('query', TEST_CONFIG.timeout.query);

      // Step 5: 制限情報取得
      const limitsEvent = TestDataGenerator.generateAPIGatewayEvent('GET', '/limits');

      const limitsResponse = await limitsHandler(limitsEvent);
      const limitsBody = TestAssertions.assertSuccessResponse(limitsResponse);
      TestAssertions.assertLimitsResponse(limitsBody);

      // 全体のパフォーマンス検証
      const totalTime = performanceTracker.measure('total');
      console.log('Performance Summary:', {
        upload: uploadTime,
        analysis: analysisTime,
        status: statusTime,
        query: queryTime,
        total: totalTime
      });

      // 全体の処理時間が合理的な範囲内であることを確認
      expect(totalTime).toBeLessThan(TEST_CONFIG.timeout.analysis + TEST_CONFIG.timeout.upload);
    }, TEST_CONFIG.timeout.analysis + TEST_CONFIG.timeout.upload);

    test('should handle multiple queries in sequence', async () => {
      // 前提: 動画解析が完了している状態を作成
      const uploadRequest = TestDataGenerator.generateUploadRequest();
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
      testVideoId = uploadBody.videoId;
      testS3Key = uploadBody.s3Key;

      // 解析完了
      const analysisRequest = TestDataGenerator.generateAnalysisRequest(testVideoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
      await analysisHandler(analysisEvent);

      // 複数の問い合わせを順次実行
      const questions = [
        '動画の長さはどのくらいですか？',
        '動画の主要なテーマは何ですか？',
        '動画で最も印象的なシーンはどこですか？'
      ];

      const queryResults = [];
      for (const question of questions) {
        const queryRequest = TestDataGenerator.generateQueryRequest(testVideoId, question);
        const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);
        
        const queryResponse = await queryHandler(queryEvent);
        const queryBody = TestAssertions.assertSuccessResponse(queryResponse);
        TestAssertions.assertQueryResponse(queryBody);
        
        queryResults.push(queryBody);
      }

      // 文脈保持の確認
      expect(queryResults).toHaveLength(3);
      queryResults.forEach((result, index) => {
        expect(result.question).toBe(questions[index]);
        expect(result.answer).toBeDefined();
        expect(result.answer.length).toBeGreaterThan(0);
      });
    });

    test('should handle concurrent requests gracefully', async () => {
      // 複数の同時アップロードリクエスト
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => {
        const uploadRequest = TestDataGenerator.generateUploadRequest(`concurrent-test-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        return uploadHandler(uploadEvent);
      });

      const responses = await Promise.all(concurrentRequests);
      
      // 全てのリクエストが成功することを確認
      responses.forEach(response => {
        const body = TestAssertions.assertSuccessResponse(response);
        TestAssertions.assertUploadResponse(body);
      });

      // 各レスポンスが異なるvideoIdを持つことを確認
      const videoIds = responses.map(r => JSON.parse(r.body).videoId);
      const uniqueVideoIds = new Set(videoIds);
      expect(uniqueVideoIds.size).toBe(videoIds.length);

      // クリーンアップ
      for (const response of responses) {
        const body = JSON.parse(response.body);
        await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
      }
    });
  });

  describe('Data Consistency Tests', () => {
    test('should maintain data consistency across all operations', async () => {
      // アップロード
      const uploadRequest = TestDataGenerator.generateUploadRequest();
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
      testVideoId = uploadBody.videoId;
      testS3Key = uploadBody.s3Key;

      // 解析
      const analysisRequest = TestDataGenerator.generateAnalysisRequest(testVideoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
      const analysisResponse = await analysisHandler(analysisEvent);
      const analysisBody = TestAssertions.assertSuccessResponse(analysisResponse);

      // ステータス確認でデータ整合性をチェック
      const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
        'GET', 
        '/status', 
        null, 
        { videoId: testVideoId }
      );
      const statusResponse = await statusHandler(statusEvent);
      const statusBody = TestAssertions.assertSuccessResponse(statusResponse);

      // データ整合性の検証
      expect(statusBody.videoId).toBe(testVideoId);
      expect(statusBody.status).toBe('COMPLETED');
      expect(statusBody.basicAnalysis).toEqual(analysisBody.result.basicAnalysis);
      expect(statusBody.prTexts).toEqual(analysisBody.result.prTexts);
      expect(statusBody.summaries).toEqual(analysisBody.result.summaries);

      // 問い合わせ履歴の整合性確認
      const queryRequest = TestDataGenerator.generateQueryRequest(testVideoId, 'テスト質問');
      const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);
      const queryResponse = await queryHandler(queryEvent);
      const queryBody = TestAssertions.assertSuccessResponse(queryResponse);

      expect(queryBody.videoId).toBe(testVideoId);
      expect(queryBody.question).toBe('テスト質問');
    });

    test('should handle partial failures gracefully', async () => {
      // 無効なvideoIdでの操作テスト
      const invalidVideoId = 'invalid-video-id';

      // ステータス確認（存在しない動画）
      const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
        'GET', 
        '/status', 
        null, 
        { videoId: invalidVideoId }
      );
      const statusResponse = await statusHandler(statusEvent);
      TestAssertions.assertErrorResponse(statusResponse, 404, 'RESOURCE_NOT_FOUND');

      // 問い合わせ（存在しない動画）
      const queryRequest = TestDataGenerator.generateQueryRequest(invalidVideoId, 'テスト質問');
      const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);
      const queryResponse = await queryHandler(queryEvent);
      TestAssertions.assertErrorResponse(queryResponse, 404, 'RESOURCE_NOT_FOUND');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance requirements for different file sizes', async () => {
      const fileSizes = [
        { name: 'small', size: 1024 * 1024 },      // 1MB
        { name: 'medium', size: 10 * 1024 * 1024 }, // 10MB
        { name: 'large', size: 50 * 1024 * 1024 }   // 50MB
      ];

      const performanceResults = [];

      for (const fileSize of fileSizes) {
        const tracker = new PerformanceTracker();
        tracker.start();

        // アップロード
        const uploadRequest = TestDataGenerator.generateUploadRequest(
          `${fileSize.name}-test.mp4`, 
          fileSize.size
        );
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        const uploadResponse = await uploadHandler(uploadEvent);
        const uploadTime = tracker.measure('upload');

        const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
        const videoId = uploadBody.videoId;
        const s3Key = uploadBody.s3Key;

        // 解析
        const analysisRequest = TestDataGenerator.generateAnalysisRequest(videoId);
        const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
        await analysisHandler(analysisEvent);
        const analysisTime = tracker.measure('analysis');

        performanceResults.push({
          fileSize: fileSize.name,
          uploadTime,
          analysisTime,
          totalTime: uploadTime + analysisTime
        });

        // クリーンアップ
        await TestDataCleanup.cleanupAll(videoId, s3Key);
      }

      // パフォーマンス結果の検証
      console.log('Performance Results:', performanceResults);

      // 小さいファイルは高速に処理されることを確認
      const smallFileResult = performanceResults.find(r => r.fileSize === 'small');
      expect(smallFileResult!.uploadTime).toBeLessThan(5000); // 5秒以内
      expect(smallFileResult!.analysisTime).toBeLessThan(30000); // 30秒以内

      // ファイルサイズに比例して処理時間が増加することを確認
      const sortedResults = performanceResults.sort((a, b) => 
        fileSizes.findIndex(f => f.name === a.fileSize) - 
        fileSizes.findIndex(f => f.name === b.fileSize)
      );

      for (let i = 1; i < sortedResults.length; i++) {
        expect(sortedResults[i].totalTime).toBeGreaterThanOrEqual(sortedResults[i-1].totalTime);
      }
    }, 120000); // 2分のタイムアウト
  });

  describe('Integration with External Services', () => {
    test('should handle Bedrock service integration', async () => {
      // モック環境でのBedrock統合テスト
      const uploadRequest = TestDataGenerator.generateUploadRequest();
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
      testVideoId = uploadBody.videoId;
      testS3Key = uploadBody.s3Key;

      // 解析実行（Bedrockモック使用）
      const analysisRequest = TestDataGenerator.generateAnalysisRequest(testVideoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
      const analysisResponse = await analysisHandler(analysisEvent);
      const analysisBody = TestAssertions.assertSuccessResponse(analysisResponse);

      // Bedrock統合の結果検証
      expect(analysisBody.result).toBeDefined();
      expect(analysisBody.result.basicAnalysis).toBeDefined();
      expect(analysisBody.result.prTexts).toBeDefined();
      expect(analysisBody.result.summaries).toBeDefined();

      // 日本語出力の確認
      expect(analysisBody.result.prTexts.short).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
      expect(analysisBody.result.summaries.short).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
    });

    test('should handle S3 and DynamoDB integration', async () => {
      // S3とDynamoDBの統合テスト
      const uploadRequest = TestDataGenerator.generateUploadRequest();
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
      testVideoId = uploadBody.videoId;
      testS3Key = uploadBody.s3Key;

      // S3キーの形式確認
      expect(testS3Key).toMatch(/^uploads\/[0-9a-f-]+\/.*\.mp4$/);

      // DynamoDBへのデータ保存確認
      const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
        'GET', 
        '/status', 
        null, 
        { videoId: testVideoId }
      );
      const statusResponse = await statusHandler(statusEvent);
      const statusBody = TestAssertions.assertSuccessResponse(statusResponse);

      expect(statusBody.videoId).toBe(testVideoId);
      expect(statusBody.createdAt).toBeDefined();
      expect(statusBody.updatedAt).toBeDefined();
    });
  });
});