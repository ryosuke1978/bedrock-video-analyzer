// メインアプリケーションクラス
class VideoAnalyzerApp {
    constructor() {
        this.currentVideoId = null;
        this.selectedFile = null;
        this.queryHistory = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadSystemLimits();
    }

    // DOM要素を初期化
    initializeElements() {
        // アップロード関連
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.selectFileBtn = document.getElementById('selectFileBtn');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.removeFileBtn = document.getElementById('removeFileBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        // プログレス関連
        this.progressContainer = document.getElementById('progressContainer');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressFill = document.getElementById('progressFill');
        
        // セクション
        this.uploadSection = document.getElementById('uploadSection');
        this.analysisSection = document.getElementById('analysisSection');
        this.querySection = document.getElementById('querySection');
        
        // 解析関連
        this.analysisStatus = document.getElementById('analysisStatus');
        this.analysisResults = document.getElementById('analysisResults');
        this.videoSummary = document.getElementById('videoSummary');
        
        // 質問関連
        this.questionInput = document.getElementById('questionInput');
        this.askBtn = document.getElementById('askBtn');
        this.historyList = document.getElementById('historyList');
        
        // システム情報
        this.systemLimits = document.getElementById('systemLimits');
    }

    // イベントリスナーを設定
    attachEventListeners() {
        // ファイル選択
        this.selectFileBtn.addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // ドラッグ&ドロップ
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
        
        // ファイル削除
        this.removeFileBtn.addEventListener('click', () => {
            this.clearSelectedFile();
        });
        
        // アップロード開始
        this.uploadBtn.addEventListener('click', () => {
            this.startUpload();
        });
        
        // 質問送信
        this.askBtn.addEventListener('click', () => {
            this.askQuestion();
        });
        
        this.questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.askQuestion();
            }
        });
    }

    // システム制限情報を読み込み
    async loadSystemLimits() {
        try {
            const limits = await api.getLimits();
            this.displaySystemLimits(limits);
        } catch (error) {
            this.showError('システム情報の読み込みに失敗しました');
            Utils.error('Failed to load system limits', error);
        }
    }

    // システム制限情報を表示
    displaySystemLimits(limits) {
        const limitsHtml = `
            <div class="limit-item">
                <div class="limit-icon"><i class="fas fa-file-video"></i></div>
                <div class="limit-label">対応形式</div>
                <div class="limit-value">${limits.videoFormats ? limits.videoFormats.join(', ') : 'MP4, MOV, AVI, MKV, WebM'}</div>
            </div>
            <div class="limit-item">
                <div class="limit-icon"><i class="fas fa-weight-hanging"></i></div>
                <div class="limit-label">最大ファイルサイズ</div>
                <div class="limit-value">${limits.maxFileSize || '100MB'}</div>
            </div>
            <div class="limit-item">
                <div class="limit-icon"><i class="fas fa-clock"></i></div>
                <div class="limit-label">最大動画時間</div>
                <div class="limit-value">${limits.maxDuration || '1時間'}</div>
            </div>
            <div class="limit-item">
                <div class="limit-icon"><i class="fas fa-globe-asia"></i></div>
                <div class="limit-label">対応リージョン</div>
                <div class="limit-value">${limits.supportedRegions ? limits.supportedRegions.join(', ') : 'ap-northeast-1'}</div>
            </div>
        `;
        
        this.systemLimits.innerHTML = limitsHtml;
    }

    // ファイル選択処理
    handleFileSelect(file) {
        Utils.log('File selected', { name: file.name, size: file.size, type: file.type });
        
        // ファイル検証
        if (!Utils.validateFileType(file)) {
            this.showError(CONFIG.MESSAGES.FILE_TYPE_ERROR);
            return;
        }
        
        if (!Utils.validateFileSize(file)) {
            this.showError(CONFIG.MESSAGES.FILE_TOO_LARGE);
            return;
        }
        
        this.selectedFile = file;
        this.displayFileInfo(file);
    }

    // ファイル情報を表示
    displayFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = Utils.formatFileSize(file.size);
        
        this.fileInfo.style.display = 'block';
        this.fileInfo.classList.add('fade-in');
    }

    // 選択ファイルをクリア
    clearSelectedFile() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.fileInfo.style.display = 'none';
    }

    // アップロード開始
    async startUpload() {
        if (!this.selectedFile) {
            this.showError('ファイルが選択されていません');
            return;
        }

        try {
            this.setUploadProgress(0, 'アップロード準備中...');
            this.progressContainer.style.display = 'block';
            this.uploadBtn.disabled = true;

            // プリサインドURL取得
            const uploadData = await api.getUploadUrl(
                this.selectedFile.name,
                this.selectedFile.size
            );

            this.currentVideoId = uploadData.videoId;
            Utils.log('Got upload URL', uploadData);

            // ファイルアップロード
            await api.uploadFile(
                uploadData.uploadUrl,
                this.selectedFile,
                (progress) => {
                    this.setUploadProgress(progress, 'アップロード中...');
                }
            );

            this.setUploadProgress(100, CONFIG.MESSAGES.UPLOAD_SUCCESS);
            this.showSuccess(CONFIG.MESSAGES.UPLOAD_SUCCESS);

            // 解析開始
            setTimeout(() => {
                this.startAnalysis();
            }, 1000);

        } catch (error) {
            this.showError(error.message);
            this.uploadBtn.disabled = false;
            Utils.error('Upload failed', error);
        }
    }

    // アップロード進捗を設定
    setUploadProgress(percent, text) {
        this.progressPercent.textContent = `${Math.round(percent)}%`;
        this.progressText.textContent = text;
        this.progressFill.style.width = `${percent}%`;
    }

    // 動画解析開始
    async startAnalysis() {
        try {
            this.showAnalysisSection();
            this.updateAnalysisStatus('解析開始中...', 'fas fa-play');

            // 解析開始
            await api.startAnalysis(this.currentVideoId);
            
            this.updateAnalysisStatus('動画を解析中です...', 'fas fa-spinner fa-spin');

            // 解析完了まで待機
            const result = await api.waitForAnalysis(
                this.currentVideoId,
                (status) => {
                    this.updateAnalysisStatus(
                        status.message || '動画を解析中です...',
                        'fas fa-spinner fa-spin'
                    );
                }
            );

            this.showAnalysisResults(result);
            this.showQuerySection();

        } catch (error) {
            this.showError(error.message);
            this.updateAnalysisStatus('解析に失敗しました', 'fas fa-exclamation-triangle');
            Utils.error('Analysis failed', error);
        }
    }

    // 解析セクションを表示
    showAnalysisSection() {
        this.analysisSection.style.display = 'block';
        this.analysisSection.classList.add('fade-in');
        this.analysisSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 解析ステータスを更新
    updateAnalysisStatus(message, iconClass) {
        const statusIcon = this.analysisStatus.querySelector('.status-icon i');
        const statusText = this.analysisStatus.querySelector('.status-text h3');
        
        statusIcon.className = iconClass;
        statusText.textContent = message;
    }

    // 解析結果を表示
    showAnalysisResults(result) {
        this.updateAnalysisStatus('解析完了', 'fas fa-check-circle');
        
        const summary = result.summary || result.analysis || '動画の解析が完了しました。下記から質問をお送りください。';
        this.videoSummary.innerHTML = `<p>${summary}</p>`;
        
        this.analysisResults.style.display = 'block';
        this.analysisResults.classList.add('fade-in');
    }

    // 質問セクションを表示
    showQuerySection() {
        this.querySection.style.display = 'block';
        this.querySection.classList.add('fade-in');
        this.querySection.scrollIntoView({ behavior: 'smooth' });
    }

    // 質問送信
    async askQuestion() {
        const question = this.questionInput.value.trim();
        
        if (!question) {
            this.showError('質問を入力してください');
            return;
        }

        if (!this.currentVideoId) {
            this.showError('動画が解析されていません');
            return;
        }

        try {
            this.askBtn.disabled = true;
            this.askBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';

            const response = await api.queryVideo(this.currentVideoId, question);
            
            this.addToHistory(question, response.answer || response.response);
            this.questionInput.value = '';
            this.showSuccess(CONFIG.MESSAGES.QUERY_SUCCESS);

        } catch (error) {
            this.showError(error.message);
            Utils.error('Query failed', error);
        } finally {
            this.askBtn.disabled = false;
            this.askBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 質問する';
        }
    }

    // 質問履歴に追加
    addToHistory(question, answer) {
        const historyItem = {
            id: Utils.generateUUID(),
            question,
            answer,
            timestamp: new Date()
        };

        this.queryHistory.unshift(historyItem);
        this.renderHistory();
    }

    // 履歴を表示
    renderHistory() {
        if (this.queryHistory.length === 0) {
            this.historyList.innerHTML = '<p class="text-muted">まだ質問がありません</p>';
            return;
        }

        const historyHtml = this.queryHistory.map(item => `
            <div class="history-item fade-in">
                <div class="question">
                    <i class="fas fa-question-circle"></i> ${item.question}
                </div>
                <div class="answer">
                    <i class="fas fa-robot"></i> ${item.answer}
                </div>
                <div class="timestamp">
                    ${Utils.formatTime(item.timestamp)}
                </div>
            </div>
        `).join('');

        this.historyList.innerHTML = historyHtml;
    }

    // 成功メッセージを表示
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    // エラーメッセージを表示
    showError(message) {
        this.showAlert(message, 'error');
    }

    // アラートを表示
    showAlert(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        const iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        
        const alertHtml = `
            <div class="alert ${alertClass} fade-in">
                <i class="${iconClass}"></i>
                ${message}
            </div>
        `;

        // 既存のアラートを削除
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // 新しいアラートを追加
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = alertHtml;
        const alertElement = tempDiv.firstElementChild;
        
        document.body.insertBefore(alertElement, document.body.firstChild);

        // 5秒後に自動削除
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.remove();
            }
        }, 5000);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    Utils.log('Initializing Bedrock Video Analyzer App');
    window.app = new VideoAnalyzerApp();
});