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
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn()
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
  ScanCommand: jest.fn(),
  DeleteCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: mockCloudWatchSend
  })),
  PutMetricDataCommand: jest.fn()
}));

// テスト対象のインポート（モック後に行う）
import { handler } from '../lambda/src/cleanup';

describe('Cleanup Lambda Handler', () => {
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
    process.env.TEMP_FILE_RETENTION_DAYS = '1';
    process.env.ANALYSIS_FILE_RETENTION_DAYS = '7';
    process.env.PROCESSED_FILE_RETENTION_DAYS = '30';
    process.env.QUERY_HISTORY_RETENTION_DAYS = '90';
    process.env.MAX_STORAGE_USAGE_BYTES = '10737418240';
    process.env.ENABLE_STORAGE_OPTIMIZATION = 'true';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should be defined', () => {
    expect(handler).toBeDefined();
  });

  test('should execute cleanup with mocked services', async () => {
    // モックをリセット
    mockS3Send.mockClear();
    mockDocSend.mockClear();
    mockCloudWatchSend.mockClear();

    // 基本的なモック設定
    mockS3Send.mockResolvedValue({ Contents: [] });
    mockDocSend.mockResolvedValue({ Items: [] });
    mockCloudWatchSend.mockResolvedValue({});

    // テスト実行
    await expect(handler(mockEvent)).resolves.toBeUndefined();

    // 基本的な呼び出しが行われることを確認
    expect(mockS3Send).toHaveBeenCalled();
    expect(mockDocSend).toHaveBeenCalled();
    expect(mockCloudWatchSend).toHaveBeenCalled();
  });
});