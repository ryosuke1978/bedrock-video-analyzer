"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const video_analyzer_stack_1 = require("../lib/video-analyzer-stack");
describe('VideoAnalyzerStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new video_analyzer_stack_1.VideoAnalyzerStack(app, 'TestVideoAnalyzerStack');
        template = assertions_1.Template.fromStack(stack);
    });
    test('S3 Bucket is created with correct configuration', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true
            },
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        }
                    }
                ]
            }
        });
    });
    test('DynamoDB tables are created', () => {
        // VideoAnalysisTable
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            KeySchema: [
                {
                    AttributeName: 'videoId',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'uploadTimestamp',
                    KeyType: 'RANGE'
                }
            ],
            BillingMode: 'PAY_PER_REQUEST',
            PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true
            }
        });
        // QueryHistoryTable
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            KeySchema: [
                {
                    AttributeName: 'videoId',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'queryId',
                    KeyType: 'RANGE'
                }
            ]
        });
    });
    test('Lambda functions are created with correct runtime', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Runtime: 'nodejs18.x'
        });
    });
    test('API Gateway is created with CORS configuration', () => {
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: 'Video Analyzer API'
        });
    });
    test('IAM roles have correct permissions', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: [
                            's3:GetObject',
                            's3:PutObject',
                            's3:DeleteObject',
                            's3:ListBucket'
                        ]
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'dynamodb:GetItem',
                            'dynamodb:PutItem',
                            'dynamodb:UpdateItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:Query',
                            'dynamodb:Scan'
                        ]
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'bedrock:InvokeModel',
                            'bedrock:InvokeModelWithResponseStream'
                        ]
                    }
                ]
            }
        });
    });
    test('S3 lifecycle rules are configured correctly', () => {
        template.hasResourceProperties('AWS::S3::Bucket', {
            LifecycleConfiguration: {
                Rules: [
                    {
                        Id: 'temp-files-cleanup',
                        Status: 'Enabled',
                        ExpirationInDays: 1,
                        Filter: {
                            Prefix: 'temp/'
                        }
                    },
                    {
                        Id: 'uploads-cleanup',
                        Status: 'Enabled',
                        ExpirationInDays: 7,
                        Filter: {
                            Prefix: 'uploads/'
                        }
                    },
                    {
                        Id: 'processed-cleanup',
                        Status: 'Enabled',
                        ExpirationInDays: 30,
                        Filter: {
                            Prefix: 'processed/'
                        }
                    }
                ]
            }
        });
    });
    test('Stack outputs are defined', () => {
        template.hasOutput('ApiUrl', {});
        template.hasOutput('VideoBucketName', {});
        template.hasOutput('VideoAnalysisTableName', {});
        template.hasOutput('QueryHistoryTableName', {});
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlkZW8tYW5hbHl6ZXItc3RhY2sudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvdmlkZW8tYW5hbHl6ZXItc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUFrRDtBQUNsRCxzRUFBaUU7QUFFakUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxJQUFJLEdBQVksQ0FBQztJQUNqQixJQUFJLEtBQXlCLENBQUM7SUFDOUIsSUFBSSxRQUFrQixDQUFDO0lBRXZCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsS0FBSyxHQUFHLElBQUkseUNBQWtCLENBQUMsR0FBRyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDOUQsUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtRQUMzRCxRQUFRLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7WUFDaEQsOEJBQThCLEVBQUU7Z0JBQzlCLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixxQkFBcUIsRUFBRSxJQUFJO2FBQzVCO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLGlDQUFpQyxFQUFFO29CQUNqQzt3QkFDRSw2QkFBNkIsRUFBRTs0QkFDN0IsWUFBWSxFQUFFLFFBQVE7eUJBQ3ZCO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDdkMscUJBQXFC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RTtRQUNyQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQyxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakQsUUFBUSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcclxuaW1wb3J0IHsgVmlkZW9BbmFseXplclN0YWNrIH0gZnJvbSAnLi4vbGliL3ZpZGVvLWFuYWx5emVyLXN0YWNrJztcclxuXHJcbmRlc2NyaWJlKCdWaWRlb0FuYWx5emVyU3RhY2snLCAoKSA9PiB7XHJcbiAgbGV0IGFwcDogY2RrLkFwcDtcclxuICBsZXQgc3RhY2s6IFZpZGVvQW5hbHl6ZXJTdGFjaztcclxuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XHJcbiAgICBzdGFjayA9IG5ldyBWaWRlb0FuYWx5emVyU3RhY2soYXBwLCAnVGVzdFZpZGVvQW5hbHl6ZXJTdGFjaycpO1xyXG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdTMyBCdWNrZXQgaXMgY3JlYXRlZCB3aXRoIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpTMzo6QnVja2V0Jywge1xyXG4gICAgICBQdWJsaWNBY2Nlc3NCbG9ja0NvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICBCbG9ja1B1YmxpY0FjbHM6IHRydWUsXHJcbiAgICAgICAgQmxvY2tQdWJsaWNQb2xpY3k6IHRydWUsXHJcbiAgICAgICAgSWdub3JlUHVibGljQWNsczogdHJ1ZSxcclxuICAgICAgICBSZXN0cmljdFB1YmxpY0J1Y2tldHM6IHRydWVcclxuICAgICAgfSxcclxuICAgICAgQnVja2V0RW5jcnlwdGlvbjoge1xyXG4gICAgICAgIFNlcnZlclNpZGVFbmNyeXB0aW9uQ29uZmlndXJhdGlvbjogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbkJ5RGVmYXVsdDoge1xyXG4gICAgICAgICAgICAgIFNTRUFsZ29yaXRobTogJ0FFUzI1NidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ0R5bmFtb0RCIHRhYmxlcyBhcmUgY3JlYXRlZCcsICgpID0+IHtcclxuICAgIC8vIFZpZGVvQW5hbHlzaXNUYWJsZVxyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcclxuICAgICAgS2V5U2NoZW1hOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3ZpZGVvSWQnLFxyXG4gICAgICAgICAgS2V5VHlwZTogJ0hBU0gnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAndXBsb2FkVGltZXN0YW1wJyxcclxuICAgICAgICAgIEtleVR5cGU6ICdSQU5HRSdcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIEJpbGxpbmdNb2RlOiAnUEFZX1BFUl9SRVFVRVNUJyxcclxuICAgICAgUG9pbnRJblRpbWVSZWNvdmVyeVNwZWNpZmljYXRpb246IHtcclxuICAgICAgICBQb2ludEluVGltZVJlY292ZXJ5RW5hYmxlZDogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBRdWVyeUhpc3RvcnlUYWJsZVxyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcclxuICAgICAgS2V5U2NoZW1hOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQXR0cmlidXRlTmFtZTogJ3ZpZGVvSWQnLFxyXG4gICAgICAgICAgS2V5VHlwZTogJ0hBU0gnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAncXVlcnlJZCcsXHJcbiAgICAgICAgICBLZXlUeXBlOiAnUkFOR0UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnTGFtYmRhIGZ1bmN0aW9ucyBhcmUgY3JlYXRlZCB3aXRoIGNvcnJlY3QgcnVudGltZScsICgpID0+IHtcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xyXG4gICAgICBSdW50aW1lOiAnbm9kZWpzMTgueCdcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdBUEkgR2F0ZXdheSBpcyBjcmVhdGVkIHdpdGggQ09SUyBjb25maWd1cmF0aW9uJywgKCkgPT4ge1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6OlJlc3RBcGknLCB7XHJcbiAgICAgIE5hbWU6ICdWaWRlbyBBbmFseXplciBBUEknXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnSUFNIHJvbGVzIGhhdmUgY29ycmVjdCBwZXJtaXNzaW9ucycsICgpID0+IHtcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpJQU06OlBvbGljeScsIHtcclxuICAgICAgUG9saWN5RG9jdW1lbnQ6IHtcclxuICAgICAgICBTdGF0ZW1lbnQ6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxyXG4gICAgICAgICAgICBBY3Rpb246IFtcclxuICAgICAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcclxuICAgICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCdcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxyXG4gICAgICAgICAgICBBY3Rpb246IFtcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbidcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxyXG4gICAgICAgICAgICBBY3Rpb246IFtcclxuICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcbiAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdTMyBsaWZlY3ljbGUgcnVsZXMgYXJlIGNvbmZpZ3VyZWQgY29ycmVjdGx5JywgKCkgPT4ge1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XHJcbiAgICAgIExpZmVjeWNsZUNvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICBSdWxlczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBJZDogJ3RlbXAtZmlsZXMtY2xlYW51cCcsXHJcbiAgICAgICAgICAgIFN0YXR1czogJ0VuYWJsZWQnLFxyXG4gICAgICAgICAgICBFeHBpcmF0aW9uSW5EYXlzOiAxLFxyXG4gICAgICAgICAgICBGaWx0ZXI6IHtcclxuICAgICAgICAgICAgICBQcmVmaXg6ICd0ZW1wLydcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgSWQ6ICd1cGxvYWRzLWNsZWFudXAnLFxyXG4gICAgICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgICAgRXhwaXJhdGlvbkluRGF5czogNyxcclxuICAgICAgICAgICAgRmlsdGVyOiB7XHJcbiAgICAgICAgICAgICAgUHJlZml4OiAndXBsb2Fkcy8nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIElkOiAncHJvY2Vzc2VkLWNsZWFudXAnLFxyXG4gICAgICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgICAgRXhwaXJhdGlvbkluRGF5czogMzAsXHJcbiAgICAgICAgICAgIEZpbHRlcjoge1xyXG4gICAgICAgICAgICAgIFByZWZpeDogJ3Byb2Nlc3NlZC8nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdTdGFjayBvdXRwdXRzIGFyZSBkZWZpbmVkJywgKCkgPT4ge1xyXG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBcGlVcmwnLCB7fSk7XHJcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ1ZpZGVvQnVja2V0TmFtZScsIHt9KTtcclxuICAgIHRlbXBsYXRlLmhhc091dHB1dCgnVmlkZW9BbmFseXNpc1RhYmxlTmFtZScsIHt9KTtcclxuICAgIHRlbXBsYXRlLmhhc091dHB1dCgnUXVlcnlIaXN0b3J5VGFibGVOYW1lJywge30pO1xyXG4gIH0pO1xyXG59KTsiXX0=