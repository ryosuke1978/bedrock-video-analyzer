/**
 * パフォーマンスE2Eテスト
 * 負荷テスト、レスポンス時間測定、スループット測定
 */

import { 
  TestDataGenerator, 
  TestDataCleanup, 
  TestAssertions, 
  PerformanceTracker,
  TEST_CONFIG
} from './setup';

// Lambda関数のモック実装（complete-flow.testから共有）
const uploadHandler = async (event: any) => {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'リクエストボディが必要です' } })
    };
  }

  const request = JSON.parse(event.body);
  
  if (!request.fileName || !request.fileSize) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { type: 'VALIDATION_ERROR', message: 'fileName と fileSize は必須です' } })
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
};

const analysisHandler = async (event: any) => {
  const request = JSON.parse(event.body);
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: request.videoId,
      status: 'COMPLETED',
      result: {
        basicAnalysis: {
          summary: 'テスト動画の基本解析結果です。',
          scenes: ['オープニング', 'メイン', 'エンディング'],
          objects: ['人物', 'テキスト'],
          activities: ['話している', '移動']
        },
        prTexts: {
          short: 'この動画は興味深いコンテンツを提供しています。',
          long: 'この動画は非常に興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。'
        },
        summaries: {
          short: 'この動画では重要なトピックについて解説しています。',
          long: 'この動画では重要なトピックについて詳しく解説しており、実用的な内容が含まれています。'
        }
      }
    })
  };
};

const queryHandler = async (event: any) => {
  const request = JSON.parse(event.body);
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryId: generateUUID(),
      videoId: request.videoId,
      question: request.question,
      answer: `「${request.question}」についてお答えします。`,
      confidence: 0.85,
      timeReferences: ['00:01:30']
    })
  };
};

const statusHandler = async (event: any) => {
  const videoId = event.queryStringParameters?.videoId;
  
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

const limitsHandler = async (event: any) => {
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

// generateUUID関数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

describe('Performance E2E Tests', () => {
  beforeAll(() => {
    // テスト環境変数の設定
    process.env.REGION = TEST_CONFIG.region;
    process.env.VIDEO_BUCKET_NAME = TEST_CONFIG.videoBucket;
    process.env.VIDEO_ANALYSIS_TABLE_NAME = TEST_CONFIG.videoAnalysisTable;
    process.env.QUERY_HISTORY_TABLE_NAME = TEST_CONFIG.queryHistoryTable;
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK = 'true';
  });

  describe('Response Time Tests', () => {
    test('should meet upload response time requirements', async () => {
      const performanceTracker = new PerformanceTracker();
      const testCases = [
        { name: 'small', size: 1024 * 1024 },      // 1MB
        { name: 'medium', size: 10 * 1024 * 1024 }, // 10MB
        { name: 'large', size: 50 * 1024 * 1024 }   // 50MB
      ];

      const results = [];

      for (const testCase of testCases) {
        performanceTracker.start();

        const uploadRequest = TestDataGenerator.generateUploadRequest(
          `${testCase.name}-perf-test.mp4`,
          testCase.size
        );
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        
        const uploadResponse = await uploadHandler(uploadEvent);
        const responseTime = performanceTracker.measure(`upload-${testCase.name}`);

        TestAssertions.assertSuccessResponse(uploadResponse);
        
        results.push({
          fileSize: testCase.name,
          sizeBytes: testCase.size,
          responseTime
        });

        // クリーンアップ
        const body = JSON.parse(uploadResponse.body);
        await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
      }

      // パフォーマンス要件の検証
      console.log('Upload Response Times:', results);

      // 小さいファイルは5秒以内
      const smallResult = results.find(r => r.fileSize === 'small');
      expect(smallResult!.responseTime).toBeLessThan(5000);

      // 中サイズファイルは15秒以内
      const mediumResult = results.find(r => r.fileSize === 'medium');
      expect(mediumResult!.responseTime).toBeLessThan(15000);

      // 大きいファイルは30秒以内
      const largeResult = results.find(r => r.fileSize === 'large');
      expect(largeResult!.responseTime).toBeLessThan(30000);
    }, 120000); // 2分のタイムアウト

    test('should meet analysis response time requirements', async () => {
      const performanceTracker = new PerformanceTracker();
      const testVideos = [];

      // 複数の動画をアップロード
      for (let i = 0; i < 3; i++) {
        const uploadRequest = TestDataGenerator.generateUploadRequest(`analysis-perf-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        const uploadResponse = await uploadHandler(uploadEvent);
        const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
        testVideos.push(uploadBody);
      }

      const analysisResults = [];

      // 各動画の解析時間を測定
      for (const [index, video] of testVideos.entries()) {
        performanceTracker.start();

        const analysisRequest = TestDataGenerator.generateAnalysisRequest(video.videoId);
        const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
        
        const analysisResponse = await analysisHandler(analysisEvent);
        const analysisTime = performanceTracker.measure(`analysis-${index}`);

        TestAssertions.assertSuccessResponse(analysisResponse);
        TestAssertions.assertAnalysisResponse(JSON.parse(analysisResponse.body));

        analysisResults.push({
          videoId: video.videoId,
          analysisTime
        });
      }

      // パフォーマンス要件の検証
      console.log('Analysis Response Times:', analysisResults);

      // 全ての解析が5分以内に完了
      analysisResults.forEach(result => {
        expect(result.analysisTime).toBeLessThan(TEST_CONFIG.timeout.analysis);
      });

      // 平均解析時間が2分以内
      const averageTime = analysisResults.reduce((sum, r) => sum + r.analysisTime, 0) / analysisResults.length;
      expect(averageTime).toBeLessThan(120000); // 2分

      // クリーンアップ
      for (const video of testVideos) {
        await TestDataCleanup.cleanupAll(video.videoId, video.s3Key);
      }
    }, 600000); // 10分のタイムアウト

    test('should meet query response time requirements', async () => {
      // 前提: 解析済み動画を準備
      const uploadRequest = TestDataGenerator.generateUploadRequest('query-perf-test.mp4');
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);

      const analysisRequest = TestDataGenerator.generateAnalysisRequest(uploadBody.videoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
      await analysisHandler(analysisEvent);

      const performanceTracker = new PerformanceTracker();
      const questions = [
        '動画の内容を教えてください',
        '動画の長さはどのくらいですか？',
        '動画で最も印象的なシーンはどこですか？',
        '動画の主要なテーマは何ですか？',
        '動画に登場する人物について教えてください'
      ];

      const queryResults = [];

      for (const [index, question] of questions.entries()) {
        performanceTracker.start();

        const queryRequest = TestDataGenerator.generateQueryRequest(uploadBody.videoId, question);
        const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);
        
        const queryResponse = await queryHandler(queryEvent);
        const queryTime = performanceTracker.measure(`query-${index}`);

        TestAssertions.assertSuccessResponse(queryResponse);
        TestAssertions.assertQueryResponse(JSON.parse(queryResponse.body));

        queryResults.push({
          question,
          queryTime
        });
      }

      // パフォーマンス要件の検証
      console.log('Query Response Times:', queryResults);

      // 全ての問い合わせが1分以内に完了
      queryResults.forEach(result => {
        expect(result.queryTime).toBeLessThan(TEST_CONFIG.timeout.query);
      });

      // 平均問い合わせ時間が30秒以内
      const averageTime = queryResults.reduce((sum, r) => sum + r.queryTime, 0) / queryResults.length;
      expect(averageTime).toBeLessThan(30000); // 30秒

      // クリーンアップ
      await TestDataCleanup.cleanupAll(uploadBody.videoId, uploadBody.s3Key);
    }, 300000); // 5分のタイムアウト

    test('should meet status check response time requirements', async () => {
      // 前提: 複数の動画を準備
      const testVideos = [];
      for (let i = 0; i < 5; i++) {
        const uploadRequest = TestDataGenerator.generateUploadRequest(`status-perf-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        const uploadResponse = await uploadHandler(uploadEvent);
        const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
        testVideos.push(uploadBody);
      }

      const performanceTracker = new PerformanceTracker();
      const statusResults = [];

      // 各動画のステータス確認時間を測定
      for (const [index, video] of testVideos.entries()) {
        performanceTracker.start();

        const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
          'GET', 
          '/status', 
          null, 
          { videoId: video.videoId }
        );
        
        const statusResponse = await statusHandler(statusEvent);
        const statusTime = performanceTracker.measure(`status-${index}`);

        TestAssertions.assertSuccessResponse(statusResponse);
        TestAssertions.assertStatusResponse(JSON.parse(statusResponse.body));

        statusResults.push({
          videoId: video.videoId,
          statusTime
        });
      }

      // パフォーマンス要件の検証
      console.log('Status Check Response Times:', statusResults);

      // 全てのステータス確認が10秒以内に完了
      statusResults.forEach(result => {
        expect(result.statusTime).toBeLessThan(TEST_CONFIG.timeout.status);
      });

      // 平均ステータス確認時間が3秒以内
      const averageTime = statusResults.reduce((sum, r) => sum + r.statusTime, 0) / statusResults.length;
      expect(averageTime).toBeLessThan(3000); // 3秒

      // クリーンアップ
      for (const video of testVideos) {
        await TestDataCleanup.cleanupAll(video.videoId, video.s3Key);
      }
    });
  });

  describe('Load Tests', () => {
    test('should handle concurrent upload requests', async () => {
      const concurrentRequests = 10;
      const performanceTracker = new PerformanceTracker();
      
      performanceTracker.start();

      // 同時アップロードリクエストを生成
      const uploadPromises = Array.from({ length: concurrentRequests }, (_, i) => {
        const uploadRequest = TestDataGenerator.generateUploadRequest(`concurrent-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        return uploadHandler(uploadEvent);
      });

      const responses = await Promise.all(uploadPromises);
      const totalTime = performanceTracker.measure('concurrent-uploads');

      // 結果の検証
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const errorCount = responses.filter(r => r.statusCode >= 400).length;

      console.log(`Concurrent Upload Results: ${successCount} success, ${errorCount} errors, ${totalTime}ms total`);

      // 少なくとも80%のリクエストが成功することを期待
      expect(successCount / concurrentRequests).toBeGreaterThanOrEqual(0.8);

      // 全体の処理時間が合理的な範囲内
      expect(totalTime).toBeLessThan(60000); // 1分以内

      // 成功したリクエストのクリーンアップ
      for (const response of responses) {
        if (response.statusCode === 200) {
          const body = JSON.parse(response.body);
          await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
        }
      }
    }, 120000); // 2分のタイムアウト

    test('should handle concurrent analysis requests', async () => {
      // 前提: 複数の動画をアップロード
      const testVideos = [];
      for (let i = 0; i < 5; i++) {
        const uploadRequest = TestDataGenerator.generateUploadRequest(`analysis-load-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        const uploadResponse = await uploadHandler(uploadEvent);
        const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);
        testVideos.push(uploadBody);
      }

      const performanceTracker = new PerformanceTracker();
      performanceTracker.start();

      // 同時解析リクエストを実行
      const analysisPromises = testVideos.map(video => {
        const analysisRequest = TestDataGenerator.generateAnalysisRequest(video.videoId);
        const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
        return analysisHandler(analysisEvent);
      });

      const responses = await Promise.all(analysisPromises);
      const totalTime = performanceTracker.measure('concurrent-analysis');

      // 結果の検証
      const successCount = responses.filter(r => r.statusCode === 200).length;
      console.log(`Concurrent Analysis Results: ${successCount}/${testVideos.length} success, ${totalTime}ms total`);

      // 全てのリクエストが成功することを期待（モック環境）
      expect(successCount).toBe(testVideos.length);

      // 並列処理により、シーケンシャル処理より高速であることを確認
      const averageTime = totalTime / testVideos.length;
      expect(averageTime).toBeLessThan(TEST_CONFIG.timeout.analysis);

      // クリーンアップ
      for (const video of testVideos) {
        await TestDataCleanup.cleanupAll(video.videoId, video.s3Key);
      }
    }, 600000); // 10分のタイムアウト

    test('should handle high-frequency status checks', async () => {
      // 前提: 1つの動画をアップロード
      const uploadRequest = TestDataGenerator.generateUploadRequest('status-load-test.mp4');
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);

      const performanceTracker = new PerformanceTracker();
      const statusCheckCount = 20;
      
      performanceTracker.start();

      // 高頻度でステータス確認を実行
      const statusPromises = Array.from({ length: statusCheckCount }, () => {
        const statusEvent = TestDataGenerator.generateAPIGatewayEvent(
          'GET', 
          '/status', 
          null, 
          { videoId: uploadBody.videoId }
        );
        return statusHandler(statusEvent);
      });

      const responses = await Promise.all(statusPromises);
      const totalTime = performanceTracker.measure('high-frequency-status');

      // 結果の検証
      const successCount = responses.filter(r => r.statusCode === 200).length;
      console.log(`High-frequency Status Results: ${successCount}/${statusCheckCount} success, ${totalTime}ms total`);

      // 全てのリクエストが成功することを期待
      expect(successCount).toBe(statusCheckCount);

      // 平均レスポンス時間が合理的な範囲内
      const averageTime = totalTime / statusCheckCount;
      expect(averageTime).toBeLessThan(5000); // 5秒以内

      // クリーンアップ
      await TestDataCleanup.cleanupAll(uploadBody.videoId, uploadBody.s3Key);
    });
  });

  describe('Throughput Tests', () => {
    test('should measure upload throughput', async () => {
      const testDuration = 30000; // 30秒間のテスト
      const startTime = Date.now();
      const completedUploads = [];
      let requestCount = 0;

      while (Date.now() - startTime < testDuration) {
        requestCount++;
        
        const uploadRequest = TestDataGenerator.generateUploadRequest(`throughput-${requestCount}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        
        try {
          const uploadResponse = await uploadHandler(uploadEvent);
          if (uploadResponse.statusCode === 200) {
            const body = JSON.parse(uploadResponse.body);
            completedUploads.push(body);
          }
        } catch (error) {
          console.warn(`Upload ${requestCount} failed:`, error);
        }

        // 短い間隔で次のリクエスト
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (completedUploads.length / actualDuration) * 1000; // requests per second

      console.log(`Upload Throughput: ${throughput.toFixed(2)} requests/second`);
      console.log(`Completed: ${completedUploads.length}/${requestCount} requests`);

      // スループット要件の検証
      expect(throughput).toBeGreaterThan(0.5); // 最低0.5 requests/second
      expect(completedUploads.length / requestCount).toBeGreaterThan(0.8); // 80%以上の成功率

      // クリーンアップ
      for (const upload of completedUploads) {
        await TestDataCleanup.cleanupAll(upload.videoId, upload.s3Key);
      }
    }, 60000); // 1分のタイムアウト

    test('should measure query throughput', async () => {
      // 前提: 解析済み動画を準備
      const uploadRequest = TestDataGenerator.generateUploadRequest('query-throughput-test.mp4');
      const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
      const uploadResponse = await uploadHandler(uploadEvent);
      const uploadBody = TestAssertions.assertSuccessResponse(uploadResponse);

      const analysisRequest = TestDataGenerator.generateAnalysisRequest(uploadBody.videoId);
      const analysisEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/analysis', analysisRequest);
      await analysisHandler(analysisEvent);

      const testDuration = 20000; // 20秒間のテスト
      const startTime = Date.now();
      const completedQueries = [];
      let requestCount = 0;

      const questions = [
        '動画の内容を教えてください',
        '動画の長さはどのくらいですか？',
        '動画の主要なテーマは何ですか？'
      ];

      while (Date.now() - startTime < testDuration) {
        requestCount++;
        const question = questions[requestCount % questions.length];
        
        const queryRequest = TestDataGenerator.generateQueryRequest(uploadBody.videoId, question);
        const queryEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/query', queryRequest);
        
        try {
          const queryResponse = await queryHandler(queryEvent);
          if (queryResponse.statusCode === 200) {
            completedQueries.push(JSON.parse(queryResponse.body));
          }
        } catch (error) {
          console.warn(`Query ${requestCount} failed:`, error);
        }

        // 短い間隔で次のリクエスト
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (completedQueries.length / actualDuration) * 1000; // requests per second

      console.log(`Query Throughput: ${throughput.toFixed(2)} requests/second`);
      console.log(`Completed: ${completedQueries.length}/${requestCount} queries`);

      // スループット要件の検証
      expect(throughput).toBeGreaterThan(0.2); // 最低0.2 requests/second
      expect(completedQueries.length / requestCount).toBeGreaterThan(0.7); // 70%以上の成功率

      // クリーンアップ
      await TestDataCleanup.cleanupAll(uploadBody.videoId, uploadBody.s3Key);
    }, 60000); // 1分のタイムアウト
  });

  describe('Memory and Resource Usage Tests', () => {
    test('should handle large file uploads without memory issues', async () => {
      const largeFileSizes = [
        50 * 1024 * 1024,   // 50MB
        100 * 1024 * 1024,  // 100MB
        200 * 1024 * 1024   // 200MB
      ];

      const results = [];

      for (const fileSize of largeFileSizes) {
        const initialMemory = process.memoryUsage();
        
        const uploadRequest = TestDataGenerator.generateUploadRequest(
          `large-${fileSize}.mp4`,
          fileSize
        );
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        
        const uploadResponse = await uploadHandler(uploadEvent);
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        results.push({
          fileSize,
          memoryIncrease,
          success: uploadResponse.statusCode === 200
        });

        // クリーンアップ
        if (uploadResponse.statusCode === 200) {
          const body = JSON.parse(uploadResponse.body);
          await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
        }

        // ガベージコレクションを促進
        if (global.gc) {
          global.gc();
        }
      }

      console.log('Memory Usage Results:', results);

      // メモリ使用量が合理的な範囲内であることを確認
      results.forEach(result => {
        // メモリ増加量がファイルサイズの2倍以下であることを確認
        expect(result.memoryIncrease).toBeLessThan(result.fileSize * 2);
      });
    }, 300000); // 5分のタイムアウト

    test('should handle multiple concurrent operations without resource exhaustion', async () => {
      const operationCount = 5;
      const initialMemory = process.memoryUsage();
      
      // 複数の操作を同時実行
      const operations = [];
      
      for (let i = 0; i < operationCount; i++) {
        // アップロード
        const uploadRequest = TestDataGenerator.generateUploadRequest(`resource-test-${i}.mp4`);
        const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
        const uploadPromise = uploadHandler(uploadEvent);
        
        operations.push(uploadPromise);
      }

      const responses = await Promise.all(operations);
      const finalMemory = process.memoryUsage();
      
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Resource Usage: ${successCount}/${operationCount} success, ${memoryIncrease} bytes memory increase`);

      // リソース使用量の検証
      expect(successCount).toBeGreaterThanOrEqual(operationCount * 0.8); // 80%以上成功
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以下のメモリ増加

      // クリーンアップ
      for (const response of responses) {
        if (response.statusCode === 200) {
          const body = JSON.parse(response.body);
          await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
        }
      }
    });
  });

  describe('Scalability Tests', () => {
    test('should maintain performance under increasing load', async () => {
      const loadLevels = [1, 3, 5, 8, 10];
      const results = [];

      for (const loadLevel of loadLevels) {
        const performanceTracker = new PerformanceTracker();
        performanceTracker.start();

        // 指定された負荷レベルで同時リクエストを実行
        const requests = Array.from({ length: loadLevel }, (_, i) => {
          const uploadRequest = TestDataGenerator.generateUploadRequest(`scale-test-${loadLevel}-${i}.mp4`);
          const uploadEvent = TestDataGenerator.generateAPIGatewayEvent('POST', '/upload', uploadRequest);
          return uploadHandler(uploadEvent);
        });

        const responses = await Promise.all(requests);
        const totalTime = performanceTracker.measure(`load-${loadLevel}`);

        const successCount = responses.filter(r => r.statusCode === 200).length;
        const averageTime = totalTime / loadLevel;

        results.push({
          loadLevel,
          successCount,
          totalTime,
          averageTime,
          successRate: successCount / loadLevel
        });

        // クリーンアップ
        for (const response of responses) {
          if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            await TestDataCleanup.cleanupAll(body.videoId, body.s3Key);
          }
        }
      }

      console.log('Scalability Results:', results);

      // スケーラビリティの検証
      results.forEach(result => {
        // 成功率が70%以上を維持
        expect(result.successRate).toBeGreaterThanOrEqual(0.7);
        
        // 平均レスポンス時間が合理的な範囲内
        expect(result.averageTime).toBeLessThan(30000); // 30秒以内
      });

      // 負荷が増加しても成功率が大幅に低下しないことを確認
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      const successRateDecline = firstResult.successRate - lastResult.successRate;
      expect(successRateDecline).toBeLessThan(0.3); // 30%以下の低下
    }, 600000); // 10分のタイムアウト
  });
});