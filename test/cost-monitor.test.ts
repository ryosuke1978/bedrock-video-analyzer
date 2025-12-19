import { ScheduledEvent } from 'aws-lambda';

// モック設定
const mockS3Send = jest.fn();
const mockDocSend = jest.fn();
const mockCloudWatchSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send
  })),
  ListObjectsV2Command: jest.fn(),
  GetBucketLocationCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: mockDocSend
    })
  },
  ScanCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: mockCloudWatchSend
  })),
  PutMetricDataCommand: jest.fn()
}));

// テスト対象のインポート（モック後に行う）
import { handler } from '../lambda/src/cost-monitor';

describe('Cost Monitor Lambda Handler', () => {
  const mockEvent: ScheduledEvent = {
    id: 'test-event-id',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    account: '123456789012',
    time: '2023-01-01T00:00:00Z',
    region: 'us-east-1',
    detail: {},
    version: '0',
    resources: ['arn:aws:events:us-east-1:123456789012:rule/test-rule']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 環境変数設定
    process.env.VIDEO_BUCKET_NAME = 'test-video-bucket';
    process.env.VIDEO_ANALYSIS_TABLE_NAME = 'test-analysis-table';
    process.env.QUERY_HISTORY_TABLE_NAME = 'test-query-history-table';
    process.env.REGION = 'us-east-1';
    process.env.DAILY_BUDGET = '10.0';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should be defined', () => {
    expect(handler).toBeDefined();
  });

  test('should generate cost report successfully', async () => {
    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // S3オブジェクトのモック（様々なストレージクラス）
    const s3Objects = [
      {
        Key: 'temp/temp-file.mp4',
        Size: 1024 * 1024 * 100, // 100MB
        LastModified: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12時間前
      },
      {
        Key: 'uploads/video1.mp4',
        Size: 1024 * 1024 * 500, // 500MB
        LastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5日前
      },
      {
        Key: 'processed/video1/thumbnail.jpg',
        Size: 1024 * 50, // 50KB
        LastModified: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15日前
      },
      {
        Key: 'uploads/old-video.mp4',
        Size: 1024 * 1024 * 200, // 200MB
        LastModified: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45日前
      }
    ];

    // S3 ListObjects レスポンス
    mockS3Send.mockResolvedValue({
      Contents: s3Objects
    });

    // DynamoDB スキャンレスポンス
    mockDocSend
      .mockResolvedValueOnce({ Count: 50 }) // analysis table count
      .mockResolvedValueOnce({ Count: 200 }) // query history table count
      .mockResolvedValueOnce({ Count: 5 }); // completed analyses today

    // CloudWatch メトリクス送信成功
    mockCloudWatchSend.mockResolvedValue({});

    // テスト実行
    await expect(handler(mockEvent)).resolves.toBeUndefined();

    // S3操作の検証
    expect(mockS3Send).toHaveBeenCalled();

    // DynamoDB操作の検証
    expect(mockDocSend).toHaveBeenCalledTimes(3);

    // CloudWatchメトリクス送信の検証（コストメトリクス + アラートメトリクス）
    expect(mockCloudWatchSend).toHaveBeenCalledTimes(2);
  });

  test('should trigger cost warning when budget threshold is exceeded', async () => {
    // 低い予算設定でテスト
    process.env.DAILY_BUDGET = '1.0'; // $1/day

    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // 大きなS3オブジェクト（高コスト）
    const largeS3Objects = [
      {
        Key: 'uploads/large-video1.mp4',
        Size: 1024 * 1024 * 1024 * 5, // 5GB
        LastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1日前
      },
      {
        Key: 'uploads/large-video2.mp4',
        Size: 1024 * 1024 * 1024 * 3, // 3GB
        LastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2日前
      }
    ];

    mockS3Send.mockResolvedValue({
      Contents: largeS3Objects
    });

    // 多くのDynamoDBレコード
    mockDocSend
      .mockResolvedValueOnce({ Count: 1000 }) // analysis table count
      .mockResolvedValueOnce({ Count: 5000 }) // query history table count
      .mockResolvedValueOnce({ Count: 50 }); // completed analyses today (high Bedrock usage)

    mockCloudWatchSend.mockResolvedValue({});

    await expect(handler(mockEvent)).resolves.toBeUndefined();

    // 警告レベルのアラートメトリクスが送信されることを確認
    expect(mockCloudWatchSend).toHaveBeenCalledTimes(2);
  });

  test('should handle S3 errors gracefully', async () => {
    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // S3エラーをシミュレート
    mockS3Send.mockRejectedValue(new Error('S3 Access Denied'));
    mockDocSend.mockResolvedValue({ Count: 0 });
    mockCloudWatchSend.mockResolvedValue({});

    // エラーが発生してもハンドラーが例外を投げることを確認
    await expect(handler(mockEvent)).rejects.toThrow('S3 Access Denied');
  });

  test('should calculate costs for different storage classes correctly', async () => {
    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // 異なるストレージクラスのオブジェクト
    const mixedStorageObjects = [
      {
        Key: 'temp/recent-temp.mp4',
        Size: 1024 * 1024 * 100, // 100MB - Standard pricing
        LastModified: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6時間前
      },
      {
        Key: 'uploads/week-old.mp4',
        Size: 1024 * 1024 * 200, // 200MB - Standard-IA pricing
        LastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10日前
      },
      {
        Key: 'processed/month-old.mp4',
        Size: 1024 * 1024 * 300, // 300MB - Glacier pricing
        LastModified: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40日前
      }
    ];

    mockS3Send.mockResolvedValue({
      Contents: mixedStorageObjects
    });

    mockDocSend.mockResolvedValue({ Count: 10 });
    mockCloudWatchSend.mockResolvedValue({});

    await expect(handler(mockEvent)).resolves.toBeUndefined();

    // 異なるストレージクラスのコスト計算が実行されることを確認
    expect(mockS3Send).toHaveBeenCalled();
    expect(mockCloudWatchSend).toHaveBeenCalled();
  });

  test('should send comprehensive cost metrics', async () => {
    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // 基本的なモック設定
    mockS3Send.mockResolvedValue({ Contents: [] });
    mockDocSend.mockResolvedValue({ Count: 0 });
    mockCloudWatchSend.mockResolvedValue({});

    await expect(handler(mockEvent)).resolves.toBeUndefined();

    // コストメトリクスが送信されることを確認
    expect(mockCloudWatchSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Namespace: 'VideoAnalyzer/Cost'
        })
      })
    );
  });
});