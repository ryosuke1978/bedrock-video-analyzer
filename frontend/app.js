// アプリケーションの状態管理
class VideoAnalyzerApp {
    constructor() {
        this.currentVideoId = null;
        this.apiBaseUrl = 'https://your-api-gateway-url.amazonaws.com/prod'; // 実際のAPIエンドポイントに置き換え
        this.currentSection = 'upload';
        
        // 制限情報表示コンポーネントの初期化
        this.limitsDisplay = null;
        
        // 多言語対応の初期化
        this.initializeI18n();
        
        this.initializeEventListeners();
        this.initializeLimitsDisplay();
        this.showSection('upload');
    }

    // 制限情報表示コンポーネントの初期化
    initializeLimitsDisplay() {
        // LimitsDisplayクラスが読み込まれるまで待機
        if (typeof window.LimitsDisplay === 'undefined') {
            setTimeout(() => this.initializeLimitsDisplay(), 100);
            return;
        }
        
        this.limitsDisplay = new window.LimitsDisplay(this.apiBaseUrl);
    }

    // 多言語対応の初期化
    initializeI18n() {
        // i18n.jsが読み込まれるまで待機
        if (typeof window.i18n === 'undefined') {
            setTimeout(() => this.initializeI18n(), 100);
            return;
        }
        
        // UI要素のテキストを日本語に更新
        window.i18n.updateUITexts();
    }

    // イベントリスナーの初期化
    initializeEventListeners() {
        // ファイル選択関連
        const fileInput = document.getElementById('file-input');
        const selectFileBtn = document.getElementById('select-file-btn');
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.getElementById('upload-btn');

        selectFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        uploadBtn.addEventListener('click', () => this.uploadFile());

        // ドラッグ&ドロップ
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        uploadArea.addEventListener('click', () => fileInput.click());

        // 進行状況画面
        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn.addEventListener('click', () => this.cancelAnalysis());

        // 結果画面
        const exportJsonBtn = document.getElementById('export-json-btn');
        const newAnalysisBtn = document.getElementById('new-analysis-btn');
        const showQueryBtn = document.getElementById('show-query-btn');

        exportJsonBtn.addEventListener('click', () => this.exportResults());
        newAnalysisBtn.addEventListener('click', () => this.startNewAnalysis());
        showQueryBtn.addEventListener('click', () => this.showSection('query'));

        // コピーボタン
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                this.copyToClipboard(e.target.dataset.target);
            }
        });

        // 問い合わせ画面
        const submitQuestionBtn = document.getElementById('submit-question-btn');
        const backToResultsBtn = document.getElementById('back-to-results-btn');
        const questionInput = document.getElementById('question-input');
        const clearInputBtn = document.getElementById('clear-input-btn');
        const charCounter = document.getElementById('char-counter');

        submitQuestionBtn.addEventListener('click', () => this.submitQuestion());
        backToResultsBtn.addEventListener('click', () => this.showSection('results'));
        clearInputBtn.addEventListener('click', () => this.clearQuestionInput());

        // 文字数カウンター
        questionInput.addEventListener('input', (e) => {
            this.updateCharCounter(e.target.value.length);
        });

        // Enterキーでの送信（Shift+Enterは改行）
        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitQuestion();
            }
        });

        // 質問例ボタン
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('example-btn')) {
                questionInput.value = e.target.dataset.question;
                this.updateCharCounter(questionInput.value.length);
                // 入力フィールドにフォーカス
                questionInput.focus();
            }
        });
    }

    // セクション表示切り替え
    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');
        this.currentSection = sectionName;
    }

    // ファイル選択処理
    handleFileSelect(file) {
        if (!file) return;

        // ファイル形式の詳細検証
        const validationResult = this.validateVideoFile(file);
        if (!validationResult.isValid) {
            this.showError(validationResult.error);
            return;
        }

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.clearError();
    }

    // 動画ファイルの包括的検証（多言語対応）
    validateVideoFile(file) {
        // 対応フォーマットの定義（要件1.1に基づく）
        const supportedFormats = {
            'mp4': ['video/mp4'],
            'mov': ['video/quicktime', 'video/mov'],
            'avi': ['video/avi', 'video/x-msvideo'],
            'mkv': ['video/x-matroska'],
            'webm': ['video/webm'],
            'mxf': ['application/mxf'],
            'flv': ['video/x-flv'],
            'wmv': ['video/x-ms-wmv'],
            'm4v': ['video/x-m4v', 'video/mp4']
        };

        // ファイル拡張子チェック
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!Object.keys(supportedFormats).includes(fileExtension)) {
            const formatsText = Object.keys(supportedFormats).join(', ').toUpperCase();
            return {
                isValid: false,
                error: window.i18n ? 
                    window.i18n.getErrorMessage('unsupportedFormat', { formats: formatsText }) :
                    `対応していないファイル形式です。\n対応形式: ${formatsText}`
            };
        }

        // MIMEタイプチェック（可能な場合）
        if (file.type) {
            const expectedMimeTypes = supportedFormats[fileExtension];
            if (!expectedMimeTypes.includes(file.type)) {
                return {
                    isValid: false,
                    error: window.i18n ? 
                        window.i18n.getErrorMessage('mimeTypeMismatch', { detectedType: file.type }) :
                        `ファイルの内容が拡張子と一致しません。\n検出されたタイプ: ${file.type}`
                };
            }
        }

        // ファイルサイズチェック（要件1.2に基づく - 100MB制限）
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: window.i18n ? 
                    window.i18n.getErrorMessage('fileSizeTooLarge', { 
                        currentSize: this.formatFileSize(file.size),
                        maxSize: this.formatFileSize(maxSize)
                    }) :
                    `ファイルサイズが制限を超えています。\n現在のサイズ: ${this.formatFileSize(file.size)}\n最大サイズ: ${this.formatFileSize(maxSize)}`
            };
        }

        // 最小ファイルサイズチェック（破損ファイル検出）
        const minSize = 1024; // 1KB
        if (file.size < minSize) {
            return {
                isValid: false,
                error: window.i18n ? 
                    window.i18n.getErrorMessage('fileTooSmall') :
                    'ファイルが小さすぎます。有効な動画ファイルを選択してください。'
            };
        }

        // ファイル名の検証
        if (file.name.length > 255) {
            return {
                isValid: false,
                error: window.i18n ? 
                    window.i18n.getErrorMessage('fileNameTooLong') :
                    'ファイル名が長すぎます（最大255文字）。'
            };
        }

        // 特殊文字チェック
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(file.name)) {
            return {
                isValid: false,
                error: window.i18n ? 
                    window.i18n.getErrorMessage('invalidCharacters') :
                    'ファイル名に使用できない文字が含まれています。'
            };
        }

        return { isValid: true };
    }

    // エラー表示（多言語対応）
    showError(message, isTranslated = false) {
        // 既存のエラー表示を削除
        this.clearError();

        // メッセージが翻訳済みでない場合は、英語から日本語に翻訳
        let displayMessage = message;
        if (!isTranslated && window.i18n && window.i18n.isEnglishText(message)) {
            displayMessage = window.i18n.translateEnglishToJapanese(message);
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <div class="error-text">${displayMessage.replace(/\n/g, '<br>')}</div>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        const uploadSection = document.getElementById('upload-section');
        uploadSection.insertBefore(errorDiv, uploadSection.firstChild);

        // 自動削除（10秒後）
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    // エラー表示をクリア
    clearError() {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // ファイル情報表示（多言語対応）
    displayFileInfo(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = this.formatFileSize(file.size);
        document.getElementById('file-format').textContent = file.name.split('.').pop().toUpperCase();
        
        const fileInfoDiv = document.getElementById('file-info');
        fileInfoDiv.style.display = 'block';

        // アップロードボタンの状態管理（多言語対応）
        const uploadBtn = document.getElementById('upload-btn');
        uploadBtn.disabled = false;
        uploadBtn.textContent = window.i18n ? window.i18n.t('ui.uploadStart') : 'アップロード開始';
        uploadBtn.className = 'btn btn-success';

        // ファイル情報にアニメーション追加
        fileInfoDiv.style.animation = 'fadeIn 0.3s ease';
    }

    // ファイルサイズフォーマット
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ファイルアップロード
    async uploadFile() {
        if (!this.selectedFile) return;

        // 再検証（安全性のため）
        const validationResult = this.validateVideoFile(this.selectedFile);
        if (!validationResult.isValid) {
            this.showError(validationResult.error);
            return;
        }

        try {
            this.clearError();
            this.setUploadButtonState('uploading');
            this.showUploadProgress(true);
            this.updateUploadProgress(0, 'アップロード準備中...');

            // プリサインドURL取得
            this.updateUploadProgress(10, 'サーバーに接続中...');
            const response = await fetch(`${this.apiBaseUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: this.selectedFile.name,
                    fileSize: this.selectedFile.size,
                    contentType: this.selectedFile.type || 'application/octet-stream',
                    fileExtension: this.selectedFile.name.split('.').pop().toLowerCase()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `サーバーエラー: ${response.status}`);
            }

            const data = await response.json();
            this.currentVideoId = data.videoId;

            // S3にファイルアップロード（進行状況付き）
            this.updateUploadProgress(20, 'ファイルをアップロード中...');
            
            await this.uploadToS3WithProgress(data.presignedUrl, this.selectedFile);

            this.updateUploadProgress(100, 'アップロード完了！');
            this.setUploadButtonState('completed');

            // 成功メッセージ表示
            setTimeout(() => {
                this.showUploadSuccess();
                // 解析開始
                setTimeout(() => {
                    this.startAnalysis();
                }, 2000);
            }, 1000);

        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('uploadFailed', { message: error.message }) :
                `アップロードに失敗しました: ${error.message}`;
            this.showError(errorMessage, true);
            this.showUploadProgress(false);
            this.setUploadButtonState('ready');
        }
    }

    // アップロードボタンの状態設定（多言語対応）
    setUploadButtonState(state) {
        const uploadBtn = document.getElementById('upload-btn');
        
        switch (state) {
            case 'ready':
                uploadBtn.disabled = false;
                uploadBtn.textContent = window.i18n ? window.i18n.t('ui.uploadStart') : 'アップロード開始';
                uploadBtn.className = 'btn btn-success';
                break;
            case 'uploading':
                uploadBtn.disabled = true;
                uploadBtn.textContent = window.i18n ? window.i18n.t('ui.uploading') : 'アップロード中...';
                uploadBtn.className = 'btn btn-secondary';
                break;
            case 'completed':
                uploadBtn.disabled = true;
                uploadBtn.textContent = window.i18n ? window.i18n.t('ui.uploadCompleted') : '✓ アップロード完了';
                uploadBtn.className = 'btn btn-success';
                break;
            default:
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'ファイルを選択してください';
                uploadBtn.className = 'btn btn-secondary';
        }
    }

    // 進行状況表示の制御
    showUploadProgress(show) {
        const progressDiv = document.getElementById('upload-progress');
        progressDiv.style.display = show ? 'block' : 'none';
        
        if (!show) {
            // リセット
            this.updateUploadProgress(0, '準備中...');
        }
    }

    // アップロード進行状況の更新
    updateUploadProgress(percentage, status) {
        const progressFill = document.getElementById('upload-progress-fill');
        const statusText = document.getElementById('upload-status');
        
        progressFill.style.width = `${percentage}%`;
        statusText.textContent = status;

        // 進行状況に応じた色変更
        if (percentage < 30) {
            progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
        } else if (percentage < 70) {
            progressFill.style.background = 'linear-gradient(90deg, #4299e1, #667eea)';
        } else if (percentage < 100) {
            progressFill.style.background = 'linear-gradient(90deg, #48bb78, #4299e1)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #48bb78, #38a169)';
        }
    }

    // S3への進行状況付きアップロード
    async uploadToS3WithProgress(presignedUrl, file) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // 進行状況の監視
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 80) + 20; // 20-100%の範囲
                    const loaded = this.formatFileSize(event.loaded);
                    const total = this.formatFileSize(event.total);
                    this.updateUploadProgress(percentage, `アップロード中... ${loaded} / ${total}`);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`アップロードに失敗しました (${xhr.status})`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('ネットワークエラーが発生しました'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('アップロードがタイムアウトしました'));
            });

            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.timeout = 300000; // 5分のタイムアウト
            xhr.send(file);
        });
    }

    // アップロード成功表示（多言語対応）
    showUploadSuccess() {
        const successMessage = window.i18n ? 
            window.i18n.getSuccessMessage('uploadCompleted') : 
            'ファイルのアップロードが完了しました！\n解析を開始します...';

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <span class="success-icon">✅</span>
                <div class="success-text">
                    ${successMessage.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;

        const uploadSection = document.getElementById('upload-section');
        uploadSection.insertBefore(successDiv, uploadSection.firstChild);

        // 自動削除（5秒後）
        setTimeout(() => {
            if (successDiv.parentElement) {
                successDiv.remove();
            }
        }, 5000);
    }

    // 解析開始
    async startAnalysis() {
        try {
            this.showSection('progress');
            
            // 解析開始API呼び出し
            const response = await fetch(`${this.apiBaseUrl}/analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: this.currentVideoId
                })
            });

            if (!response.ok) {
                throw new Error('解析開始に失敗しました');
            }

            // 進行状況監視開始
            this.monitorProgress();

        } catch (error) {
            console.error('Analysis start error:', error);
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('analysisStartFailed') :
                '解析開始に失敗しました';
            alert(errorMessage + ': ' + error.message);
        }
    }

    // 進行状況監視
    async monitorProgress() {
        const progressInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/status?videoId=${this.currentVideoId}`);
                
                if (!response.ok) {
                    throw new Error('ステータス取得に失敗しました');
                }

                const data = await response.json();
                this.updateProgressDisplay(data);

                if (data.status === 'COMPLETED') {
                    clearInterval(progressInterval);
                    this.displayResults(data);
                } else if (data.status === 'FAILED') {
                    clearInterval(progressInterval);
                    const errorMessage = window.i18n ? 
                        window.i18n.getErrorMessage('analysisFailed') :
                        '解析に失敗しました';
                    alert(errorMessage);
                    this.showSection('upload');
                }

            } catch (error) {
                console.error('Progress monitoring error:', error);
                const errorMessage = window.i18n ? 
                    window.i18n.getErrorMessage('statusFetchFailed') :
                    'ステータス取得に失敗しました';
                alert(errorMessage);
                clearInterval(progressInterval);
            }
        }, 2000); // 2秒ごとに確認
    }

    // 進行状況表示更新
    updateProgressDisplay(data) {
        const progress = data.progress || 0;
        document.getElementById('progress-percentage').textContent = `${progress}%`;
        
        // 円形プログレスバー更新
        const progressCircle = document.querySelector('.progress-circle');
        const angle = (progress / 100) * 360;
        progressCircle.style.background = `conic-gradient(#667eea ${angle}deg, #e2e8f0 ${angle}deg)`;

        // 推定残り時間表示
        const estimatedTime = data.estimatedTimeRemaining || 0;
        document.getElementById('estimated-time').textContent = 
            estimatedTime > 0 ? `約${Math.ceil(estimatedTime / 60)}分` : '計算中...';

        // 機能ステータス更新（モック）
        if (progress > 20) {
            document.getElementById('basic-analysis-status').textContent = '処理中';
            document.getElementById('basic-analysis-status').className = 'function-status processing';
        }
        if (progress > 60) {
            document.getElementById('pr-generation-status').textContent = '処理中';
            document.getElementById('pr-generation-status').className = 'function-status processing';
        }
        if (progress > 80) {
            document.getElementById('summary-generation-status').textContent = '処理中';
            document.getElementById('summary-generation-status').className = 'function-status processing';
        }
        if (progress === 100) {
            document.querySelectorAll('.function-status').forEach(status => {
                status.textContent = '完了';
                status.className = 'function-status completed';
            });
        }
    }

    // 結果表示（多言語対応・結果表示コンポーネント統合）
    displayResults(data) {
        this.showSection('results');

        // 解析結果を日本語化
        const translatedData = window.i18n ? window.i18n.translateAnalysisResult(data) : data;

        // 結果表示コンポーネントを使用
        if (window.resultsDisplay) {
            window.resultsDisplay.displayResults(translatedData);
        } else {
            // フォールバック: 従来の表示方法
            this.displayResultsFallback(translatedData);
        }

        this.analysisResults = translatedData;
    }

    // フォールバック結果表示
    displayResultsFallback(translatedData) {
        // 基本解析結果
        if (translatedData.basicAnalysis) {
            const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';
            const overviewText = window.i18n ? window.i18n.t('analysisCategories.overview') : '概要';
            const scenesText = window.i18n ? window.i18n.t('analysisCategories.scenes') : '検出されたシーン';
            const objectsText = window.i18n ? window.i18n.t('analysisCategories.objects') : '検出されたオブジェクト';
            const activitiesText = window.i18n ? window.i18n.t('analysisCategories.activities') : '検出されたアクティビティ';

            const basicAnalysisDiv = document.getElementById('basic-analysis-result');
            basicAnalysisDiv.innerHTML = `
                <div class="analysis-summary">
                    <h4>${overviewText}</h4>
                    <p>${translatedData.basicAnalysis.summary || noDataText}</p>
                </div>
                <div class="analysis-details">
                    <div class="detail-item">
                        <h5>${scenesText}</h5>
                        <ul>${(translatedData.basicAnalysis.scenes || []).map(scene => `<li>${scene}</li>`).join('') || `<li>${noDataText}</li>`}</ul>
                    </div>
                    <div class="detail-item">
                        <h5>${objectsText}</h5>
                        <ul>${(translatedData.basicAnalysis.objects || []).map(obj => `<li>${obj}</li>`).join('') || `<li>${noDataText}</li>`}</ul>
                    </div>
                    <div class="detail-item">
                        <h5>${activitiesText}</h5>
                        <ul>${(translatedData.basicAnalysis.activities || []).map(activity => `<li>${activity}</li>`).join('') || `<li>${noDataText}</li>`}</ul>
                    </div>
                </div>
            `;
        }

        // PR文章
        if (translatedData.prTexts) {
            const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';
            document.getElementById('pr-short').textContent = translatedData.prTexts.short || noDataText;
            document.getElementById('pr-long').textContent = translatedData.prTexts.long || noDataText;
        }

        // あらすじ
        if (translatedData.summaries) {
            const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';
            document.getElementById('summary-short').textContent = translatedData.summaries.short || noDataText;
            document.getElementById('summary-long').textContent = translatedData.summaries.long || noDataText;
        }
    }

    // 解析キャンセル（多言語対応）
    cancelAnalysis() {
        const confirmMessage = window.i18n ? 
            window.i18n.getErrorMessage('confirmCancel') :
            '解析をキャンセルしますか？';
        
        if (confirm(confirmMessage)) {
            this.showSection('upload');
            this.currentVideoId = null;
        }
    }

    // クリップボードにコピー
    async copyToClipboard(targetId) {
        const element = document.getElementById(targetId);
        const text = element.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            
            // コピー成功のフィードバック（多言語対応）
            const copyBtn = document.querySelector(`[data-target="${targetId}"]`);
            const originalText = copyBtn.textContent;
            const copiedText = window.i18n ? window.i18n.t('ui.copiedButton') : '✅ コピー済み';
            copyBtn.textContent = copiedText;
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('copyFailed') :
                'コピーに失敗しました';
            alert(errorMessage);
        }
    }

    // 結果をJSONでエクスポート（結果表示コンポーネント統合）
    exportResults() {
        if (!this.analysisResults) {
            alert('エクスポートする結果がありません');
            return;
        }

        // 結果表示コンポーネントのエクスポート機能を使用
        if (window.resultsDisplay) {
            window.resultsDisplay.exportToJSON();
        } else {
            // フォールバック: 従来のエクスポート方法
            const dataStr = JSON.stringify(this.analysisResults, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `video-analysis-${this.currentVideoId || 'results'}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }
    }

    // 新しい解析開始
    startNewAnalysis() {
        this.currentVideoId = null;
        this.selectedFile = null;
        this.analysisResults = null;
        
        // フォームリセット
        document.getElementById('file-input').value = '';
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('query-history').innerHTML = '';
        
        // エラー・成功メッセージクリア
        this.clearError();
        const successMessage = document.querySelector('.success-message');
        if (successMessage) {
            successMessage.remove();
        }
        
        // ボタン状態リセット
        this.setUploadButtonState('default');
        
        // 進行状況リセット
        document.getElementById('progress-percentage').textContent = '0%';
        document.querySelector('.progress-circle').style.background = 'conic-gradient(#667eea 0deg, #e2e8f0 0deg)';
        document.querySelectorAll('.function-status').forEach(status => {
            status.textContent = '待機中';
            status.className = 'function-status waiting';
        });
        
        this.showSection('upload');
    }

    // 質問送信
    async submitQuestion() {
        const questionInput = document.getElementById('question-input');
        const question = questionInput.value.trim();
        
        if (!question) {
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('enterQuestion') :
                '質問を入力してください';
            alert(errorMessage);
            return;
        }

        if (!this.currentVideoId) {
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('noVideoAnalyzed') :
                '解析が完了した動画がありません';
            alert(errorMessage);
            return;
        }

        try {
            // 質問を履歴に追加（送信中表示）
            this.addQuestionToHistory(question, '回答を生成中...', null, null, true);
            questionInput.value = '';

            const response = await fetch(`${this.apiBaseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoId: this.currentVideoId,
                    question: question
                })
            });

            if (!response.ok) {
                throw new Error('質問の送信に失敗しました');
            }

            const data = await response.json();
            
            // 履歴を更新（実際の回答で置き換え）
            this.updateLastQuestionInHistory(data.answer, data.confidence, data.timeReferences);

        } catch (error) {
            console.error('Question submission error:', error);
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('questionSubmissionFailed') :
                '質問の送信に失敗しました';
            this.updateLastQuestionInHistory(errorMessage + ': ' + error.message, null, null);
        }
    }

    // 質問を履歴に追加
    addQuestionToHistory(question, answer, confidence, timeReferences, isLoading = false) {
        const historyDiv = document.getElementById('query-history');
        const queryItem = document.createElement('div');
        queryItem.className = 'query-item';
        
        let confidenceHtml = '';
        let timeReferencesHtml = '';
        
        if (confidence !== null && confidence !== undefined) {
            const confidenceLabel = window.i18n ? window.i18n.t('ui.confidence') : '信頼度';
            confidenceHtml = `<span class="confidence">${confidenceLabel}: ${Math.round(confidence * 100)}%</span>`;
        }
        
        if (timeReferences && timeReferences.length > 0) {
            const timeReferencesLabel = window.i18n ? window.i18n.t('ui.timeReferences') : '参照時間';
            timeReferencesHtml = `<span class="time-references">${timeReferencesLabel}: ${timeReferences.join(', ')}</span>`;
        }

        queryItem.innerHTML = `
            <div class="question">${question}</div>
            <div class="answer">
                ${isLoading ? '<div class="loading"></div>' : ''} ${answer}
                ${confidenceHtml || timeReferencesHtml ? `<div class="answer-meta">${confidenceHtml}${timeReferencesHtml}</div>` : ''}
            </div>
        `;
        
        historyDiv.appendChild(queryItem);
        historyDiv.scrollTop = historyDiv.scrollHeight;
    }

    // 最後の質問の回答を更新
    updateLastQuestionInHistory(answer, confidence, timeReferences) {
        const historyDiv = document.getElementById('query-history');
        const lastItem = historyDiv.lastElementChild;
        
        if (lastItem) {
            const answerDiv = lastItem.querySelector('.answer');
            
            let confidenceHtml = '';
            let timeReferencesHtml = '';
            
            if (confidence !== null && confidence !== undefined) {
                const confidenceLabel = window.i18n ? window.i18n.t('ui.confidence') : '信頼度';
                confidenceHtml = `<span class="confidence">${confidenceLabel}: ${Math.round(confidence * 100)}%</span>`;
            }
            
            if (timeReferences && timeReferences.length > 0) {
                const timeReferencesLabel = window.i18n ? window.i18n.t('ui.timeReferences') : '参照時間';
                timeReferencesHtml = `<span class="time-references">${timeReferencesLabel}: ${timeReferences.join(', ')}</span>`;
            }

            answerDiv.innerHTML = `
                ${answer}
                ${confidenceHtml || timeReferencesHtml ? `<div class="answer-meta">${confidenceHtml}${timeReferencesHtml}</div>` : ''}
            `;
        }
    }

    // 文字数カウンター更新
    updateCharCounter(length) {
        const charCounter = document.getElementById('char-counter');
        const maxLength = 500;
        
        charCounter.textContent = length;
        
        // 文字数に応じてスタイル変更
        const counterContainer = charCounter.parentElement;
        if (length > maxLength * 0.9) {
            counterContainer.classList.add('warning');
        } else {
            counterContainer.classList.remove('warning');
        }
        
        // 送信ボタンの状態管理
        const submitBtn = document.getElementById('submit-question-btn');
        submitBtn.disabled = length === 0 || length > maxLength;
    }

    // 質問入力フィールドをクリア
    clearQuestionInput() {
        const questionInput = document.getElementById('question-input');
        questionInput.value = '';
        this.updateCharCounter(0);
        questionInput.focus();
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new VideoAnalyzerApp();
});