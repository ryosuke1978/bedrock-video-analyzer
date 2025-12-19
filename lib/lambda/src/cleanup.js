"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const s3Client = new client_s3_1.S3Client({ region: process.env.REGION });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.REGION });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const handler = async (event) => {
    try {
        console.log('Cleanup job started:', JSON.stringify(event, null, 2));
        const bucketName = process.env.VIDEO_BUCKET_NAME;
        const tableName = process.env.VIDEO_ANALYSIS_TABLE_NAME;
        // 1. 古い一時ファイルの削除（1日以上経過）
        await cleanupTempFiles(bucketName);
        // 2. 完了した解析の古いファイル削除（7日以上経過）
        await cleanupOldAnalysisFiles(bucketName, tableName);
        // 3. DynamoDBとS3の整合性チェック
        await checkDataConsistency(bucketName, tableName);
        console.log('Cleanup job completed successfully');
    }
    catch (error) {
        console.error('Cleanup job error:', error);
        throw error;
    }
};
exports.handler = handler;
async function cleanupTempFiles(bucketName) {
    try {
        const listCommand = new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'temp/'
        });
        const response = await s3Client.send(listCommand);
        const objects = response.Contents || [];
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        for (const object of objects) {
            if (object.Key && object.LastModified) {
                const objectAge = object.LastModified.getTime();
                if (objectAge < oneDayAgo) {
                    const deleteCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: object.Key
                    });
                    await s3Client.send(deleteCommand);
                    console.log(`Deleted temp file: ${object.Key}`);
                }
            }
        }
    }
    catch (error) {
        console.error('Error cleaning up temp files:', error);
    }
}
async function cleanupOldAnalysisFiles(bucketName, tableName) {
    try {
        // 完了した解析で7日以上経過したものを取得
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: tableName,
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': 'COMPLETED'
            }
        });
        const response = await docClient.send(scanCommand);
        const items = response.Items || [];
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const item of items) {
            const updatedAt = new Date(item.updatedAt).getTime();
            if (updatedAt < sevenDaysAgo && item.s3Key) {
                // S3からファイル削除
                const deleteCommand = new client_s3_1.DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: item.s3Key
                });
                await s3Client.send(deleteCommand);
                console.log(`Deleted old analysis file: ${item.s3Key}`);
                // DynamoDBからレコード削除
                const deleteItemCommand = new lib_dynamodb_1.DeleteCommand({
                    TableName: tableName,
                    Key: {
                        videoId: item.videoId,
                        uploadTimestamp: item.uploadTimestamp
                    }
                });
                await docClient.send(deleteItemCommand);
                console.log(`Deleted old analysis record: ${item.videoId}`);
            }
        }
    }
    catch (error) {
        console.error('Error cleaning up old analysis files:', error);
    }
}
async function checkDataConsistency(bucketName, tableName) {
    try {
        // DynamoDBの全レコードを取得
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: tableName
        });
        const response = await docClient.send(scanCommand);
        const items = response.Items || [];
        for (const item of items) {
            if (item.s3Key) {
                try {
                    // S3にファイルが存在するかチェック
                    const listCommand = new client_s3_1.ListObjectsV2Command({
                        Bucket: bucketName,
                        Prefix: item.s3Key,
                        MaxKeys: 1
                    });
                    const s3Response = await s3Client.send(listCommand);
                    if (!s3Response.Contents || s3Response.Contents.length === 0) {
                        // S3にファイルが存在しない場合、DynamoDBレコードを削除
                        const deleteCommand = new lib_dynamodb_1.DeleteCommand({
                            TableName: tableName,
                            Key: {
                                videoId: item.videoId,
                                uploadTimestamp: item.uploadTimestamp
                            }
                        });
                        await docClient.send(deleteCommand);
                        console.log(`Deleted orphaned DynamoDB record: ${item.videoId}`);
                    }
                }
                catch (error) {
                    console.error(`Error checking consistency for ${item.videoId}:`, error);
                }
            }
        }
    }
    catch (error) {
        console.error('Error checking data consistency:', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW51cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xhbWJkYS9zcmMvY2xlYW51cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxrREFBeUY7QUFDekYsOERBQTBEO0FBQzFELHdEQUEyRjtBQUUzRixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDeEUsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXJELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFxQixFQUFpQixFQUFFO0lBQ3BFLElBQUk7UUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLENBQUM7UUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBMEIsQ0FBQztRQUV6RCx5QkFBeUI7UUFDekIsTUFBTSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVuQyw2QkFBNkI7UUFDN0IsTUFBTSx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFckQseUJBQXlCO1FBQ3pCLE1BQU0sb0JBQW9CLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztLQUVuRDtJQUFDLE9BQU8sS0FBSyxF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QUMsQ0FBQztvQkFFSCxNQUFNLFVBQVUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBRXBELElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDNUQsa0NBQWtDO3dCQUNsQyxNQUFNLGFBQWEsR0FBRyxJQUFJLDRCQUFhLENBQUM7NEJBQ3RDLFNBQVMsRUFBRSxTQUFTOzRCQUNwQixHQUFHLEVBQUU7Z0NBQ0gsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dDQUNyQixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7NkJBQ3RDO3lCQUNGLENBQUMsQ0FBQzt3QkFDSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO3FCQUNsRTtpQkFDRjtnQkFBQyxPQUFPLEtBQUssRUFBRTtvQkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3pFO2FBQ0Y7U0FDRjtLQUNGO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzFEO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNjaGVkdWxlZEV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBMaXN0T2JqZWN0c1YyQ29tbWFuZCwgRGVsZXRlT2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQsIERlbGV0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5cclxuY29uc3QgczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LlJFR0lPTiB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfSk7XHJcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShkeW5hbW9DbGllbnQpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IFNjaGVkdWxlZEV2ZW50KTogUHJvbWlzZTx2b2lkPiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnNvbGUubG9nKCdDbGVhbnVwIGpvYiBzdGFydGVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LlZJREVPX0JVQ0tFVF9OQU1FITtcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LlZJREVPX0FOQUxZU0lTX1RBQkxFX05BTUUhO1xyXG5cclxuICAgIC8vIDEuIOWPpOOBhOS4gOaZguODleOCoeOCpOODq+OBruWJiumZpO+8iDHml6Xku6XkuIrntYzpgY7vvIlcclxuICAgIGF3YWl0IGNsZWFudXBUZW1wRmlsZXMoYnVja2V0TmFtZSk7XHJcblxyXG4gICAgLy8gMi4g5a6M5LqG44GX44Gf6Kej5p6Q44Gu5Y+k44GE44OV44Kh44Kk44Or5YmK6Zmk77yIN+aXpeS7peS4iue1jOmBju+8iVxyXG4gICAgYXdhaXQgY2xlYW51cE9sZEFuYWx5c2lzRmlsZXMoYnVja2V0TmFtZSwgdGFibGVOYW1lKTtcclxuXHJcbiAgICAvLyAzLiBEeW5hbW9EQuOBqFMz44Gu5pW05ZCI5oCn44OB44Kn44OD44KvXHJcbiAgICBhd2FpdCBjaGVja0RhdGFDb25zaXN0ZW5jeShidWNrZXROYW1lLCB0YWJsZU5hbWUpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdDbGVhbnVwIGpvYiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdDbGVhbnVwIGpvYiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjbGVhbnVwVGVtcEZpbGVzKGJ1Y2tldE5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBsaXN0Q29tbWFuZCA9IG5ldyBMaXN0T2JqZWN0c1YyQ29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgUHJlZml4OiAndGVtcC8nXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQobGlzdENvbW1hbmQpO1xyXG4gICAgY29uc3Qgb2JqZWN0cyA9IHJlc3BvbnNlLkNvbnRlbnRzIHx8IFtdO1xyXG5cclxuICAgIGNvbnN0IG9uZURheUFnbyA9IERhdGUubm93KCkgLSAoMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBvYmplY3Qgb2Ygb2JqZWN0cykge1xyXG4gICAgICBpZiAob2JqZWN0LktleSAmJiBvYmplY3QuTGFzdE1vZGlmaWVkKSB7XHJcbiAgICAgICAgY29uc3Qgb2JqZWN0QWdlID0gb2JqZWN0Lkxhc3RNb2RpZmllZC5nZXRUaW1lKCk7XHJcbiAgICAgICAgaWYgKG9iamVjdEFnZSA8IG9uZURheUFnbykge1xyXG4gICAgICAgICAgY29uc3QgZGVsZXRlQ29tbWFuZCA9IG5ldyBEZWxldGVPYmplY3RDb21tYW5kKHtcclxuICAgICAgICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICAgICAgICBLZXk6IG9iamVjdC5LZXlcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYXdhaXQgczNDbGllbnQuc2VuZChkZWxldGVDb21tYW5kKTtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBEZWxldGVkIHRlbXAgZmlsZTogJHtvYmplY3QuS2V5fWApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjbGVhbmluZyB1cCB0ZW1wIGZpbGVzOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBPbGRBbmFseXNpc0ZpbGVzKGJ1Y2tldE5hbWU6IHN0cmluZywgdGFibGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgLy8g5a6M5LqG44GX44Gf6Kej5p6Q44GnN+aXpeS7peS4iue1jOmBjuOBl+OBn+OCguOBruOCkuWPluW+l1xyXG4gICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyNzdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xyXG4gICAgICB9LFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgJzpzdGF0dXMnOiAnQ09NUExFVEVEJ1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcclxuICAgIGNvbnN0IGl0ZW1zID0gcmVzcG9uc2UuSXRlbXMgfHwgW107XHJcblxyXG4gICAgY29uc3Qgc2V2ZW5EYXlzQWdvID0gRGF0ZS5ub3coKSAtICg3ICogMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZWRBdCA9IG5ldyBEYXRlKGl0ZW0udXBkYXRlZEF0KS5nZXRUaW1lKCk7XHJcbiAgICAgIGlmICh1cGRhdGVkQXQgPCBzZXZlbkRheXNBZ28gJiYgaXRlbS5zM0tleSkge1xyXG4gICAgICAgIC8vIFMz44GL44KJ44OV44Kh44Kk44Or5YmK6ZmkXHJcbiAgICAgICAgY29uc3QgZGVsZXRlQ29tbWFuZCA9IG5ldyBEZWxldGVPYmplY3RDb21tYW5kKHtcclxuICAgICAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgICAgIEtleTogaXRlbS5zM0tleVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQoZGVsZXRlQ29tbWFuZCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYERlbGV0ZWQgb2xkIGFuYWx5c2lzIGZpbGU6ICR7aXRlbS5zM0tleX1gKTtcclxuXHJcbiAgICAgICAgLy8gRHluYW1vRELjgYvjgonjg6zjgrPjg7zjg4nliYrpmaRcclxuICAgICAgICBjb25zdCBkZWxldGVJdGVtQ29tbWFuZCA9IG5ldyBEZWxldGVDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICAgICAgS2V5OiB7XHJcbiAgICAgICAgICAgIHZpZGVvSWQ6IGl0ZW0udmlkZW9JZCxcclxuICAgICAgICAgICAgdXBsb2FkVGltZXN0YW1wOiBpdGVtLnVwbG9hZFRpbWVzdGFtcFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKGRlbGV0ZUl0ZW1Db21tYW5kKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgRGVsZXRlZCBvbGQgYW5hbHlzaXMgcmVjb3JkOiAke2l0ZW0udmlkZW9JZH1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjbGVhbmluZyB1cCBvbGQgYW5hbHlzaXMgZmlsZXM6JywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tEYXRhQ29uc2lzdGVuY3koYnVja2V0TmFtZTogc3RyaW5nLCB0YWJsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBEeW5hbW9EQuOBruWFqOODrOOCs+ODvOODieOCkuWPluW+l1xyXG4gICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChzY2FuQ29tbWFuZCk7XHJcbiAgICBjb25zdCBpdGVtcyA9IHJlc3BvbnNlLkl0ZW1zIHx8IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICBpZiAoaXRlbS5zM0tleSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAvLyBTM+OBq+ODleOCoeOCpOODq+OBjOWtmOWcqOOBmeOCi+OBi+ODgeOCp+ODg+OCr1xyXG4gICAgICAgICAgY29uc3QgbGlzdENvbW1hbmQgPSBuZXcgTGlzdE9iamVjdHNWMkNvbW1hbmQoe1xyXG4gICAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICAgIFByZWZpeDogaXRlbS5zM0tleSxcclxuICAgICAgICAgICAgTWF4S2V5czogMVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IHMzUmVzcG9uc2UgPSBhd2FpdCBzM0NsaWVudC5zZW5kKGxpc3RDb21tYW5kKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKCFzM1Jlc3BvbnNlLkNvbnRlbnRzIHx8IHMzUmVzcG9uc2UuQ29udGVudHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIFMz44Gr44OV44Kh44Kk44Or44GM5a2Y5Zyo44GX44Gq44GE5aC05ZCI44CBRHluYW1vRELjg6zjgrPjg7zjg4njgpLliYrpmaRcclxuICAgICAgICAgICAgY29uc3QgZGVsZXRlQ29tbWFuZCA9IG5ldyBEZWxldGVDb21tYW5kKHtcclxuICAgICAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICBLZXk6IHtcclxuICAgICAgICAgICAgICAgIHZpZGVvSWQ6IGl0ZW0udmlkZW9JZCxcclxuICAgICAgICAgICAgICAgIHVwbG9hZFRpbWVzdGFtcDogaXRlbS51cGxvYWRUaW1lc3RhbXBcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChkZWxldGVDb21tYW5kKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYERlbGV0ZWQgb3JwaGFuZWQgRHluYW1vREIgcmVjb3JkOiAke2l0ZW0udmlkZW9JZH1gKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgY2hlY2tpbmcgY29uc2lzdGVuY3kgZm9yICR7aXRlbS52aWRlb0lkfTpgLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIGRhdGEgY29uc2lzdGVuY3k6JywgZXJyb3IpO1xyXG4gIH1cclxufSJdfQ==