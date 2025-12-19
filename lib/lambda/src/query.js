"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.REGION });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.REGION });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const handler = async (event) => {
    try {
        console.log('Query request received:', JSON.stringify(event, null, 2));
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
        const { videoId, question } = JSON.parse(event.body);
        if (!videoId || !question) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'videoIdとquestionが必要です' })
            };
        }
        // 過去の問い合わせ履歴を取得（文脈保持のため）
        const queryHistoryCommand = new lib_dynamodb_1.QueryCommand({
            TableName: process.env.QUERY_HISTORY_TABLE_NAME,
            KeyConditionExpression: 'videoId = :videoId',
            ExpressionAttributeValues: {
                ':videoId': videoId
            },
            ScanIndexForward: false,
            Limit: 5 // 直近5件
        });
        const historyResult = await docClient.send(queryHistoryCommand);
        const previousQueries = historyResult.Items || [];
        // TODO: 実際のBedrock Pegasus 1.2 API呼び出しを実装
        // 現在はモックレスポンスを返す
        const mockAnswer = {
            answer: `「${question}」に対するモック回答です。実際の実装では、Bedrock Pegasus 1.2を使用して動画内容に基づいた回答を生成します。`,
            confidence: 0.85,
            timeReferences: ['00:01:30-00:02:15', '00:05:20-00:06:10'],
            context: previousQueries.length > 0 ? '過去の質問履歴を考慮した回答' : '初回の質問への回答'
        };
        // 問い合わせ履歴を保存
        const queryId = (0, uuid_1.v4)();
        const putCommand = new lib_dynamodb_1.PutCommand({
            TableName: process.env.QUERY_HISTORY_TABLE_NAME,
            Item: {
                videoId,
                queryId,
                question,
                answer: mockAnswer.answer,
                confidence: mockAnswer.confidence,
                timeReferences: mockAnswer.timeReferences,
                timestamp: new Date().toISOString()
            }
        });
        await docClient.send(putCommand);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                queryId,
                question,
                answer: mockAnswer.answer,
                confidence: mockAnswer.confidence,
                timeReferences: mockAnswer.timeReferences,
                context: mockAnswer.context,
                message: '問い合わせが完了しました'
            })
        };
    }
    catch (error) {
        console.error('Query handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({ error: '問い合わせ処理中にエラーが発生しました' })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9sYW1iZGEvc3JjL3F1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRFQUEyRjtBQUMzRiw4REFBMEQ7QUFDMUQsd0RBQXlGO0FBQ3pGLCtCQUFvQztBQUVwQyxNQUFNLGFBQWEsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMvRSxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUVyRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixJQUFJO1FBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2RSxNQUFNLE9BQU8sR0FBRztZQUNkLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsaURBQWlEO1lBQ2pGLDhCQUE4QixFQUFFLGNBQWM7U0FDL0MsQ0FBQztRQUVGLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUU7WUFDbEMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPO2dCQUNQLElBQUksRUFBRSxFQUFFO2FBQ1QsQ0FBQztTQUNIO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMs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LEVBQUUsQ0FBQztTQUN2RCxDQUFDO0tBQ0g7QUFDSCxDQUFDLENBQUM7QUF0R1csUUFBQSxPQUFPLFdBc0dsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQmVkcm9ja1J1bnRpbWVDbGllbnQsIEludm9rZU1vZGVsQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1iZWRyb2NrLXJ1bnRpbWUnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuY29uc3QgYmVkcm9ja0NsaWVudCA9IG5ldyBCZWRyb2NrUnVudGltZUNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuUkVHSU9OIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LlJFR0lPTiB9KTtcclxuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGR5bmFtb0NsaWVudCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zb2xlLmxvZygnUXVlcnkgcmVxdWVzdCByZWNlaXZlZDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG5cclxuICAgIGNvbnN0IGhlYWRlcnMgPSB7XHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5JyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJ1xyXG4gICAgfTtcclxuXHJcbiAgICBpZiAoZXZlbnQuaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogJydcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAn44Oq44Kv44Ko44K544OI44Oc44OH44Kj44GM5b+F6KaB44Gn44GZJyB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgdmlkZW9JZCwgcXVlc3Rpb24gfSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCF2aWRlb0lkIHx8ICFxdWVzdGlvbikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICd2aWRlb0lk44GocXVlc3Rpb27jgYzlv4XopoHjgafjgZknIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8g6YGO5Y6744Gu5ZWP44GE5ZCI44KP44Gb5bGl5q2044KS5Y+W5b6X77yI5paH6ISI5L+d5oyB44Gu44Gf44KB77yJXHJcbiAgICBjb25zdCBxdWVyeUhpc3RvcnlDb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuUVVFUllfSElTVE9SWV9UQUJMRV9OQU1FLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndmlkZW9JZCA9IDp2aWRlb0lkJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6dmlkZW9JZCc6IHZpZGVvSWRcclxuICAgICAgfSxcclxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UsIC8vIOacgOaWsOmghlxyXG4gICAgICBMaW1pdDogNSAvLyDnm7Tov5E15Lu2XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBoaXN0b3J5UmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQocXVlcnlIaXN0b3J5Q29tbWFuZCk7XHJcbiAgICBjb25zdCBwcmV2aW91c1F1ZXJpZXMgPSBoaXN0b3J5UmVzdWx0Lkl0ZW1zIHx8IFtdO1xyXG5cclxuICAgIC8vIFRPRE86IOWun+mam+OBrkJlZHJvY2sgUGVnYXN1cyAxLjIgQVBJ5ZG844Gz5Ye644GX44KS5a6f6KOFXHJcbiAgICAvLyDnj77lnKjjga/jg6Ljg4Pjgq/jg6zjgrnjg53jg7PjgrnjgpLov5TjgZlcclxuICAgIGNvbnN0IG1vY2tBbnN3ZXIgPSB7XHJcbiAgICAgIGFuc3dlcjogYOOAjCR7cXVlc3Rpb25944CN44Gr5a++44GZ44KL44Oi44OD44Kv5Zue562U44Gn44GZ44CC5a6f6Zqb44Gu5a6f6KOF44Gn44Gv44CBQmVkcm9jayBQZWdhc3VzIDEuMuOCkuS9v+eUqOOBl+OBpuWLleeUu+WGheWuueOBq+WfuuOBpeOBhOOBn+WbnuetlOOCkueUn+aIkOOBl+OBvuOBmeOAgmAsXHJcbiAgICAgIGNvbmZpZGVuY2U6IDAuODUsXHJcbiAgICAgIHRpbWVSZWZlcmVuY2VzOiBbJzAwOjAxOjMwLTAwOjAyOjE1JywgJzAwOjA1OjIwLTAwOjA2OjEwJ10sXHJcbiAgICAgIGNvbnRleHQ6IHByZXZpb3VzUXVlcmllcy5sZW5ndGggPiAwID8gJ+mBjuWOu+OBruizquWVj+WxpeattOOCkuiAg+aFruOBl+OBn+WbnuetlCcgOiAn5Yid5Zue44Gu6LOq5ZWP44G444Gu5Zue562UJ1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyDllY/jgYTlkIjjgo/jgZvlsaXmrbTjgpLkv53lrZhcclxuICAgIGNvbnN0IHF1ZXJ5SWQgPSB1dWlkdjQoKTtcclxuICAgIGNvbnN0IHB1dENvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuUVVFUllfSElTVE9SWV9UQUJMRV9OQU1FLFxyXG4gICAgICBJdGVtOiB7XHJcbiAgICAgICAgdmlkZW9JZCxcclxuICAgICAgICBxdWVyeUlkLFxyXG4gICAgICAgIHF1ZXN0aW9uLFxyXG4gICAgICAgIGFuc3dlcjogbW9ja0Fuc3dlci5hbnN3ZXIsXHJcbiAgICAgICAgY29uZmlkZW5jZTogbW9ja0Fuc3dlci5jb25maWRlbmNlLFxyXG4gICAgICAgIHRpbWVSZWZlcmVuY2VzOiBtb2NrQW5zd2VyLnRpbWVSZWZlcmVuY2VzLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKHB1dENvbW1hbmQpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHF1ZXJ5SWQsXHJcbiAgICAgICAgcXVlc3Rpb24sXHJcbiAgICAgICAgYW5zd2VyOiBtb2NrQW5zd2VyLmFuc3dlcixcclxuICAgICAgICBjb25maWRlbmNlOiBtb2NrQW5zd2VyLmNvbmZpZGVuY2UsXHJcbiAgICAgICAgdGltZVJlZmVyZW5jZXM6IG1vY2tBbnN3ZXIudGltZVJlZmVyZW5jZXMsXHJcbiAgICAgICAgY29udGV4dDogbW9ja0Fuc3dlci5jb250ZXh0LFxyXG4gICAgICAgIG1lc3NhZ2U6ICfllY/jgYTlkIjjgo/jgZvjgYzlrozkuobjgZfjgb7jgZfjgZ8nXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignUXVlcnkgaGFuZGxlciBlcnJvcjonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5JyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULE9QVElPTlMnXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICfllY/jgYTlkIjjgo/jgZvlh6bnkIbkuK3jgavjgqjjg6njg7zjgYznmbrnlJ/jgZfjgb7jgZfjgZ8nIH0pXHJcbiAgICB9O1xyXG4gIH1cclxufTsiXX0=