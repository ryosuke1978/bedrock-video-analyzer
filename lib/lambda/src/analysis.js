"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.REGION });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.REGION });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const handler = async (event) => {
    try {
        console.log('Analysis request received:', JSON.stringify(event, null, 2));
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        };
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'リクエストボディが必要です' })
            };
        }
        const { videoId } = JSON.parse(event.body);
        if (!videoId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'videoIdが必要です' })
            };
        }
        // DynamoDBから動画情報を取得
        const getCommand = new lib_dynamodb_1.GetCommand({
            TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
            Key: { videoId }
        });
        const result = await docClient.send(getCommand);
        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: '動画が見つかりません' })
            };
        }
        // ステータスを解析中に更新
        const updateCommand = new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
            Key: { videoId },
            UpdateExpression: 'SET #status = :status, progress = :progress, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'ANALYZING',
                ':progress': 10,
                ':updatedAt': new Date().toISOString()
            }
        });
        await docClient.send(updateCommand);
        // TODO: 実際のBedrock Pegasus 1.2 API呼び出しを実装
        // 現在はモックデータを返す
        const mockAnalysisResult = {
            basicAnalysis: {
                summary: '動画の基本解析結果（モック）',
                scenes: ['シーン1', 'シーン2', 'シーン3'],
                objects: ['オブジェクト1', 'オブジェクト2'],
                activities: ['アクティビティ1', 'アクティビティ2']
            },
            prTexts: {
                short: '200文字のPR文章（モック）',
                long: '500文字のPR文章（モック）'
            },
            summaries: {
                short: '200文字のあらすじ（モック）',
                long: '500文字のあらすじ（モック）'
            }
        };
        // 解析結果をDynamoDBに保存
        const finalUpdateCommand = new lib_dynamodb_1.UpdateCommand({
            TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
            Key: { videoId },
            UpdateExpression: 'SET #status = :status, progress = :progress, basicAnalysis = :basicAnalysis, prTexts = :prTexts, summaries = :summaries, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'COMPLETED',
                ':progress': 100,
                ':basicAnalysis': mockAnalysisResult.basicAnalysis,
                ':prTexts': mockAnalysisResult.prTexts,
                ':summaries': mockAnalysisResult.summaries,
                ':updatedAt': new Date().toISOString()
            }
        });
        await docClient.send(finalUpdateCommand);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                videoId,
                status: 'COMPLETED',
                result: mockAnalysisResult,
                message: '解析が完了しました'
            })
        };
    }
    catch (error) {
        console.error('Analysis handler error:', error);
        // エラー時はステータスを失敗に更新
        if (event.body) {
            try {
                const { videoId } = JSON.parse(event.body);
                if (videoId) {
                    const errorUpdateCommand = new lib_dynamodb_1.UpdateCommand({
                        TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
                        Key: { videoId },
                        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
                        ExpressionAttributeNames: {
                            '#status': 'status'
                        },
                        ExpressionAttributeValues: {
                            ':status': 'FAILED',
                            ':updatedAt': new Date().toISOString()
                        }
                    });
                    await docClient.send(errorUpdateCommand);
                }
            }
            catch (updateError) {
                console.error('Error updating status to FAILED:', updateError);
            }
        }
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({ error: '解析処理中にエラーが発生しました' })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9sYW1iZGEvc3JjL2FuYWx5c2lzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRFQUEyRjtBQUMzRiw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBRTFGLE1BQU0sYUFBYSxHQUFHLElBQUksNkNBQW9CLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQy9FLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDeEUsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXJELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUk7UUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTFFLE1BQU0sT0FBTyxHQUFHO1lBQ2QsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyw4QkFBOEIsRUFBRSxpREFBaUQ7WUFDakYsOEJBQThCLEVBQUUsY0FBYztTQUMvQyxDQUFDO1FBRUYsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTtZQUNsQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDO1NBQ0g7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtZQUNmLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtB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LFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLGlEQUFpRDtnQkFDakYsOEJBQThCLEVBQUUsY0FBYzthQUMvQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLENBQUM7U0FDcEQsQ0FBQztLQUNIO0FBQ0gsQ0FBQyxDQUFDO0FBM0pXLFFBQUEsT0FBTyxXQTJKbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBVcGRhdGVDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuXHJcbmNvbnN0IGJlZHJvY2tDbGllbnQgPSBuZXcgQmVkcm9ja1J1bnRpbWVDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LlJFR0lPTiB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfSk7XHJcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShkeW5hbW9DbGllbnQpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJ0FuYWx5c2lzIHJlcXVlc3QgcmVjZWl2ZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgICBjb25zdCBoZWFkZXJzID0ge1xyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleScsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QsT1BUSU9OUydcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGV2ZW50Lmh0dHBNZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6ICcnXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ+ODquOCr+OCqOOCueODiOODnOODh+OCo+OBjOW/heimgeOBp+OBmScgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IHZpZGVvSWQgfSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCF2aWRlb0lkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ3ZpZGVvSWTjgYzlv4XopoHjgafjgZknIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRHluYW1vRELjgYvjgonli5XnlLvmg4XloLHjgpLlj5blvpdcclxuICAgIGNvbnN0IGdldENvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVklERU9fQU5BTFlTSVNfVEFCTEVfTkFNRSxcclxuICAgICAgS2V5OiB7IHZpZGVvSWQgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoZ2V0Q29tbWFuZCk7XHJcbiAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ+WLleeUu+OBjOimi+OBpOOBi+OCiuOBvuOBm+OCkycgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDjgrnjg4bjg7zjgr/jgrnjgpLop6PmnpDkuK3jgavmm7TmlrBcclxuICAgIGNvbnN0IHVwZGF0ZUNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVklERU9fQU5BTFlTSVNfVEFCTEVfTkFNRSxcclxuICAgICAgS2V5OiB7IHZpZGVvSWQgfSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCAjc3RhdHVzID0gOnN0YXR1cywgcHJvZ3Jlc3MgPSA6cHJvZ3Jlc3MsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnN0YXR1cyc6ICdBTkFMWVpJTkcnLFxyXG4gICAgICAgICc6cHJvZ3Jlc3MnOiAxMCxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZCh1cGRhdGVDb21tYW5kKTtcclxuXHJcbiAgICAvLyBUT0RPOiDlrp/pmpvjga5CZWRyb2NrIFBlZ2FzdXMgMS4yIEFQSeWRvOOBs+WHuuOBl+OCkuWun+ijhVxyXG4gICAgLy8g54++5Zyo44Gv44Oi44OD44Kv44OH44O844K/44KS6L+U44GZXHJcbiAgICBjb25zdCBtb2NrQW5hbHlzaXNSZXN1bHQgPSB7XHJcbiAgICAgIGJhc2ljQW5hbHlzaXM6IHtcclxuICAgICAgICBzdW1tYXJ5OiAn5YuV55S744Gu5Z+65pys6Kej5p6Q57WQ5p6c77yI44Oi44OD44Kv77yJJyxcclxuICAgICAgICBzY2VuZXM6IFsn44K344O844OzMScsICfjgrfjg7zjg7MyJywgJ+OCt+ODvOODszMnXSxcclxuICAgICAgICBvYmplY3RzOiBbJ+OCquODluOCuOOCp+OCr+ODiDEnLCAn44Kq44OW44K444Kn44Kv44OIMiddLFxyXG4gICAgICAgIGFjdGl2aXRpZXM6IFsn44Ki44Kv44OG44Kj44OT44OG44KjMScsICfjgqLjgq/jg4bjgqPjg5Pjg4bjgqMyJ11cclxuICAgICAgfSxcclxuICAgICAgcHJUZXh0czoge1xyXG4gICAgICAgIHNob3J0OiAnMjAw5paH5a2X44GuUFLmlofnq6DvvIjjg6Ljg4Pjgq/vvIknLFxyXG4gICAgICAgIGxvbmc6ICc1MDDmloflrZfjga5QUuaWh+eroO+8iOODouODg+OCr++8iSdcclxuICAgICAgfSxcclxuICAgICAgc3VtbWFyaWVzOiB7XHJcbiAgICAgICAgc2hvcnQ6ICcyMDDmloflrZfjga7jgYLjgonjgZnjgZjvvIjjg6Ljg4Pjgq/vvIknLFxyXG4gICAgICAgIGxvbmc6ICc1MDDmloflrZfjga7jgYLjgonjgZnjgZjvvIjjg6Ljg4Pjgq/vvIknXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8g6Kej5p6Q57WQ5p6c44KSRHluYW1vRELjgavkv53lrZhcclxuICAgIGNvbnN0IGZpbmFsVXBkYXRlQ29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5WSURFT19BTkFMWVNJU19UQUJMRV9OQU1FLFxyXG4gICAgICBLZXk6IHsgdmlkZW9JZCB9LFxyXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzLCBwcm9ncmVzcyA9IDpwcm9ncmVzcywgYmFzaWNBbmFseXNpcyA9IDpiYXNpY0FuYWx5c2lzLCBwclRleHRzID0gOnByVGV4dHMsIHN1bW1hcmllcyA9IDpzdW1tYXJpZXMsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnN0YXR1cyc6ICdDT01QTEVURUQnLFxyXG4gICAgICAgICc6cHJvZ3Jlc3MnOiAxMDAsXHJcbiAgICAgICAgJzpiYXNpY0FuYWx5c2lzJzogbW9ja0FuYWx5c2lzUmVzdWx0LmJhc2ljQW5hbHlzaXMsXHJcbiAgICAgICAgJzpwclRleHRzJzogbW9ja0FuYWx5c2lzUmVzdWx0LnByVGV4dHMsXHJcbiAgICAgICAgJzpzdW1tYXJpZXMnOiBtb2NrQW5hbHlzaXNSZXN1bHQuc3VtbWFyaWVzLFxyXG4gICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKGZpbmFsVXBkYXRlQ29tbWFuZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgdmlkZW9JZCxcclxuICAgICAgICBzdGF0dXM6ICdDT01QTEVURUQnLFxyXG4gICAgICAgIHJlc3VsdDogbW9ja0FuYWx5c2lzUmVzdWx0LFxyXG4gICAgICAgIG1lc3NhZ2U6ICfop6PmnpDjgYzlrozkuobjgZfjgb7jgZfjgZ8nXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignQW5hbHlzaXMgaGFuZGxlciBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIOOCqOODqeODvOaZguOBr+OCueODhuODvOOCv+OCueOCkuWkseaVl+OBq+abtOaWsFxyXG4gICAgaWYgKGV2ZW50LmJvZHkpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB7IHZpZGVvSWQgfSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICAgICAgaWYgKHZpZGVvSWQpIHtcclxuICAgICAgICAgIGNvbnN0IGVycm9yVXBkYXRlQ29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5WSURFT19BTkFMWVNJU19UQUJMRV9OQU1FLFxyXG4gICAgICAgICAgICBLZXk6IHsgdmlkZW9JZCB9LFxyXG4gICAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICAgJzpzdGF0dXMnOiAnRkFJTEVEJyxcclxuICAgICAgICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKGVycm9yVXBkYXRlQ29tbWFuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoICh1cGRhdGVFcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIHN0YXR1cyB0byBGQUlMRUQ6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleScsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJ1xyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAn6Kej5p6Q5Yem55CG5Lit44Gr44Ko44Op44O844GM55m655Sf44GX44G+44GX44GfJyB9KVxyXG4gICAgfTtcclxuICB9XHJcbn07Il19