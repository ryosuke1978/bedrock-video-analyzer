// API通信クラス
class VideoAnalyzerAPI {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // HTTP リクエストの基本メソッド
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        Utils.log(`API Request: ${config.method || 'GET'} ${url}`, config.body);

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            Utils.log(`API Response: ${response.status}`, data);
            return data;
        } catch (error) {
            Utils.error(`API Error: ${endpoint}`, error);
            throw error;
        }
    }

    // GET リクエスト
    async get(endpoint, headers = {}) {
        return this.request(endpoint, {
            method: 'GET',
            headers
        });
    }

    // POST リクエスト
    async post(endpoint, data = null, headers = {}) {
        return this.request(endpoint, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : null
        });
    }

    // システム制限情報を取得
    async getLimits() {
        try {
            return await this.get(CONFIG.ENDPOINTS.LIMITS);
        } catch (error) {
            Utils.error('Failed to get system limits', error);
            throw new Error(CONFIG.MESSAGES.NETWORK_ERROR);
        }
    }

    // ファイルアップロード用のプリサインドURLを取得
    async getUploadUrl(fileName, fileSize) {
        try {
            const data = await this.post(CONFIG.ENDPOINTS.UPLOAD, {
                fileName,
                fileSize,
                contentType: 'video/*'
            });

            return {
                videoId: data.videoId,
                presignedUrl: data.presignedUrl,
                uploadUrl: data.uploadUrl || data.presignedUrl
            };
        } catch (error) {
            Utils.error('Failed to get upload URL', error);
            throw new Error(CONFIG.MESSAGES.UPLOAD_ERROR);
        }
    }

    // ファイルをS3にアップロード
    async uploadFile(presignedUrl, file, onProgress = null) {
        try {
            Utils.log('Starting file upload', { url: presignedUrl, size: file.size });

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // プログレス監視
                if (onProgress) {
                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            onProgress(percentComplete);
                        }
                    });
                }

                // 完了時の処理
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        Utils.log('File upload completed', { status: xhr.status });
                        resolve({
                            success: true,
                            status: xhr.status
                        });
                    } else {
                        Utils.error('File upload failed', { status: xhr.status, response: xhr.responseText });
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });

                // エラー時の処理
                xhr.addEventListener('error', () => {
                    Utils.error('File upload error', xhr);
                    reject(new Error(CONFIG.MESSAGES.UPLOAD_ERROR));
                });

                // タイムアウト設定
                xhr.timeout = CONFIG.UI.UPLOAD_TIMEOUT;
                xhr.addEventListener('timeout', () => {
                    Utils.error('File upload timeout');
                    reject(new Error('アップロードがタイムアウトしました'));
                });

                // リクエスト送信
                xhr.open('PUT', presignedUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.send(file);
            });
        } catch (error) {
            Utils.error('Upload file error', error);
            throw error;
        }
    }

    // 動画解析を開始
    async startAnalysis(videoId) {
        try {
            return await this.post(CONFIG.ENDPOINTS.ANALYSIS, {
                videoId,
                action: 'start'
            });
        } catch (error) {
            Utils.error('Failed to start analysis', error);
            throw new Error(CONFIG.MESSAGES.ANALYSIS_ERROR);
        }
    }

    // 解析ステータスを取得
    async getAnalysisStatus(videoId) {
        try {
            return await this.get(`${CONFIG.ENDPOINTS.STATUS}?videoId=${videoId}`);
        } catch (error) {
            Utils.error('Failed to get analysis status', error);
            throw new Error('解析ステータスの取得に失敗しました');
        }
    }

    // 動画に質問する
    async queryVideo(videoId, question) {
        try {
            return await this.post(CONFIG.ENDPOINTS.QUERY, {
                videoId,
                question
            });
        } catch (error) {
            Utils.error('Failed to query video', error);
            throw new Error(CONFIG.MESSAGES.QUERY_ERROR);
        }
    }

    // 解析完了まで待機（ポーリング）
    async waitForAnalysis(videoId, onProgress = null) {
        const maxAttempts = CONFIG.UI.ANALYSIS_TIMEOUT / CONFIG.UI.POLLING_INTERVAL;
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    attempts++;
                    const status = await this.getAnalysisStatus(videoId);
                    
                    Utils.log(`Analysis status check ${attempts}`, status);

                    if (onProgress) {
                        onProgress(status);
                    }

                    switch (status.status) {
                        case 'completed':
                            resolve(status);
                            return;
                        case 'failed':
                        case 'error':
                            reject(new Error(status.error || CONFIG.MESSAGES.ANALYSIS_ERROR));
                            return;
                        case 'processing':
                        case 'pending':
                            if (attempts >= maxAttempts) {
                                reject(new Error('解析がタイムアウトしました'));
                                return;
                            }
                            setTimeout(checkStatus, CONFIG.UI.POLLING_INTERVAL);
                            break;
                        default:
                            if (attempts >= maxAttempts) {
                                reject(new Error('解析がタイムアウトしました'));
                                return;
                            }
                            setTimeout(checkStatus, CONFIG.UI.POLLING_INTERVAL);
                    }
                } catch (error) {
                    if (attempts >= CONFIG.UI.MAX_RETRIES) {
                        reject(error);
                    } else {
                        Utils.log(`Retrying status check (${attempts}/${CONFIG.UI.MAX_RETRIES})`);
                        setTimeout(checkStatus, CONFIG.UI.POLLING_INTERVAL);
                    }
                }
            };

            checkStatus();
        });
    }
}

// APIインスタンスを作成
const api = new VideoAnalyzerAPI();