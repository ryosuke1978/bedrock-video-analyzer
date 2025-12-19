/**
 * 制限情報表示コンポーネント
 * 要件5.1, 5.2, 5.3, 5.4に対応
 */

class LimitsDisplay {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.limitsData = null;
    this.isVisible = false;
    
    this.initializeComponent();
  }

  // コンポーネントの初期化
  initializeComponent() {
    this.createLimitsModal();
    this.attachEventListeners();
  }

  // 制限情報モーダルの作成
  createLimitsModal() {
    const modalHtml = `
      <div id="limitsModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>システム制限情報</h2>
            <span class="close" id="closeLimitsModal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="limits-tabs">
              <button class="tab-button active" data-tab="formats">対応形式</button>
              <button class="tab-button" data-tab="filesize">ファイルサイズ</button>
              <button class="tab-button" data-tab="duration">動画長</button>
              <button class="tab-button" data-tab="resolution">解像度</button>
              <button class="tab-button" data-tab="api">API制限</button>
              <button class="tab-button" data-tab="pricing">料金情報</button>
            </div>
            <div class="limits-content">
              <div id="limitsLoading" class="loading">
                <div class="spinner"></div>
                <p>制限情報を読み込み中...</p>
              </div>
              <div id="limitsError" class="error" style="display: none;">
                <p>制限情報の読み込みに失敗しました。</p>
                <button id="retryLimits" class="retry-button">再試行</button>
              </div>
              <div id="limitsData" style="display: none;">
                <!-- 動的に生成される制限情報 -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // イベントリスナーの設定
  attachEventListeners() {
    // モーダル表示ボタン
    const showLimitsButton = document.getElementById('showLimitsButton');
    if (showLimitsButton) {
      showLimitsButton.addEventListener('click', () => this.showLimits());
    }

    // モーダル閉じるボタン
    const closeButton = document.getElementById('closeLimitsModal');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideLimits());
    }

    // モーダル外クリックで閉じる
    const modal = document.getElementById('limitsModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideLimits();
        }
      });
    }

    // タブ切り替え
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        this.switchTab(e.target.dataset.tab);
      }
    });

    // 再試行ボタン
    document.addEventListener('click', (e) => {
      if (e.target.id === 'retryLimits') {
        this.loadLimitsData();
      }
    });

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hideLimits();
      }
    });
  }

  // 制限情報モーダルを表示
  async showLimits() {
    const modal = document.getElementById('limitsModal');
    modal.style.display = 'block';
    this.isVisible = true;

    // データが未読み込みの場合は読み込む
    if (!this.limitsData) {
      await this.loadLimitsData();
    } else {
      this.displayLimitsData();
    }
  }

  // 制限情報モーダルを非表示
  hideLimits() {
    const modal = document.getElementById('limitsModal');
    modal.style.display = 'none';
    this.isVisible = false;
  }

  // 制限情報データの読み込み
  async loadLimitsData() {
    const loadingElement = document.getElementById('limitsLoading');
    const errorElement = document.getElementById('limitsError');
    const dataElement = document.getElementById('limitsData');

    // ローディング表示
    loadingElement.style.display = 'block';
    errorElement.style.display = 'none';
    dataElement.style.display = 'none';

    try {
      const response = await fetch(`${this.apiBaseUrl}/limits`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.limitsData = await response.json();
      this.displayLimitsData();

    } catch (error) {
      console.error('制限情報の読み込みエラー:', error);
      this.showError();
    }
  }

  // 制限情報データの表示
  displayLimitsData() {
    const loadingElement = document.getElementById('limitsLoading');
    const errorElement = document.getElementById('limitsError');
    const dataElement = document.getElementById('limitsData');

    loadingElement.style.display = 'none';
    errorElement.style.display = 'none';
    dataElement.style.display = 'block';

    // アクティブなタブに基づいて表示
    const activeTab = document.querySelector('.tab-button.active');
    const tabName = activeTab ? activeTab.dataset.tab : 'formats';
    this.switchTab(tabName);
  }

  // エラー表示
  showError() {
    const loadingElement = document.getElementById('limitsLoading');
    const errorElement = document.getElementById('limitsError');
    const dataElement = document.getElementById('limitsData');

    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    dataElement.style.display = 'none';
  }

  // タブ切り替え
  switchTab(tabName) {
    // タブボタンのアクティブ状態更新
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // コンテンツ表示
    const dataElement = document.getElementById('limitsData');
    
    switch (tabName) {
      case 'formats':
        dataElement.innerHTML = this.renderVideoFormats();
        break;
      case 'filesize':
        dataElement.innerHTML = this.renderFileSizeLimits();
        break;
      case 'duration':
        dataElement.innerHTML = this.renderDurationLimits();
        break;
      case 'resolution':
        dataElement.innerHTML = this.renderResolutionLimits();
        break;
      case 'api':
        dataElement.innerHTML = this.renderApiLimits();
        break;
      case 'pricing':
        dataElement.innerHTML = this.renderPricingInfo();
        break;
    }
  }

  // 対応動画形式の表示（要件5.1）
  renderVideoFormats() {
    if (!this.limitsData?.videoFormats) return '<p>データが利用できません。</p>';

    const formats = this.limitsData.videoFormats;
    
    return `
      <div class="limits-section">
        <h3>対応動画形式</h3>
        <p class="section-description">以下の動画形式がサポートされています：</p>
        <div class="formats-grid">
          ${formats.map(format => `
            <div class="format-card ${format.supported ? 'supported' : 'unsupported'}">
              <div class="format-header">
                <h4>${format.format}</h4>
                <span class="format-extension">${format.extension}</span>
              </div>
              <p class="format-description">${format.description}</p>
              <div class="format-details">
                <div class="detail-item">
                  <span class="label">最大ファイルサイズ:</span>
                  <span class="value">${format.maxFileSize}</span>
                </div>
                ${format.notes ? `
                  <div class="detail-item">
                    <span class="label">備考:</span>
                    <span class="value notes">${format.notes}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="recommendation">
          <h4>推奨事項</h4>
          <ul>
            <li>最高の互換性とパフォーマンスのため、<strong>MP4形式</strong>を推奨します</li>
            <li>高品質な動画には<strong>MKV形式</strong>も適しています</li>
            <li>Web配信用途には<strong>WEBM形式</strong>をご検討ください</li>
          </ul>
        </div>
      </div>
    `;
  }

  // ファイルサイズ制限の表示（要件5.2）
  renderFileSizeLimits() {
    if (!this.limitsData?.fileSizeLimits) return '<p>データが利用できません。</p>';

    const limits = this.limitsData.fileSizeLimits;
    
    return `
      <div class="limits-section">
        <h3>ファイルサイズ制限</h3>
        <div class="limit-cards">
          <div class="limit-card primary">
            <h4>最大ファイルサイズ</h4>
            <div class="limit-value">${limits.maxFileSizeDisplay}</div>
            <p>これを超えるファイルはアップロードできません</p>
          </div>
          <div class="limit-card recommended">
            <h4>推奨サイズ</h4>
            <div class="limit-value">${limits.recommendedMaxSize}</div>
            <p>最適なパフォーマンスを得るための推奨サイズです</p>
          </div>
          <div class="limit-card warning">
            <h4>警告しきい値</h4>
            <div class="limit-value">${limits.warningThreshold}</div>
            <p>このサイズを超えると処理時間が長くなる可能性があります</p>
          </div>
        </div>
        <div class="size-guide">
          <h4>ファイルサイズの目安</h4>
          <table class="size-table">
            <thead>
              <tr>
                <th>動画品質</th>
                <th>解像度</th>
                <th>10分あたりの概算サイズ</th>
                <th>推奨用途</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>低品質</td>
                <td>480p</td>
                <td>50-100MB</td>
                <td>プレビュー、テスト用</td>
              </tr>
              <tr>
                <td>標準品質</td>
                <td>720p</td>
                <td>100-200MB</td>
                <td>一般的な用途</td>
              </tr>
              <tr>
                <td>高品質</td>
                <td>1080p</td>
                <td>200-500MB</td>
                <td>詳細な解析が必要な場合</td>
              </tr>
              <tr>
                <td>超高品質</td>
                <td>4K</td>
                <td>500MB-2GB</td>
                <td>プロフェッショナル用途</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 動画長制限の表示（要件5.2）
  renderDurationLimits() {
    if (!this.limitsData?.videoLengthLimits) return '<p>データが利用できません。</p>';

    const limits = this.limitsData.videoLengthLimits;
    
    return `
      <div class="limits-section">
        <h3>動画長制限</h3>
        <div class="limit-cards">
          <div class="limit-card primary">
            <h4>最大動画長</h4>
            <div class="limit-value">${limits.maxDurationDisplay}</div>
            <p>これを超える動画は処理できません</p>
          </div>
          <div class="limit-card recommended">
            <h4>推奨動画長</h4>
            <div class="limit-value">${limits.recommendedMaxDuration}</div>
            <p>最適な解析品質を得るための推奨長です</p>
          </div>
        </div>
        <div class="processing-info">
          <h4>処理時間の目安</h4>
          <p class="processing-estimate">${limits.processingTimeEstimate}</p>
          <div class="processing-examples">
            <h5>処理時間の例</h5>
            <ul>
              <li><strong>5分の動画</strong> → 約10-15分の処理時間</li>
              <li><strong>15分の動画</strong> → 約30-45分の処理時間</li>
              <li><strong>30分の動画</strong> → 約1-1.5時間の処理時間</li>
              <li><strong>1時間の動画</strong> → 約2-3時間の処理時間</li>
            </ul>
          </div>
          <div class="processing-tips">
            <h5>処理時間を短縮するコツ</h5>
            <ul>
              <li>不要な部分をカットして動画を短くする</li>
              <li>解像度を下げる（720p推奨）</li>
              <li>ビットレートを調整して ファイルサイズを小さくする</li>
              <li>複数の短い動画に分割して個別に処理する</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // 解像度制限の表示（要件5.2）
  renderResolutionLimits() {
    if (!this.limitsData?.resolutionLimits) return '<p>データが利用できません。</p>';

    const limits = this.limitsData.resolutionLimits;
    
    return `
      <div class="limits-section">
        <h3>解像度制限</h3>
        <div class="limit-cards">
          <div class="limit-card primary">
            <h4>最大解像度</h4>
            <div class="limit-value">${limits.maxWidth} × ${limits.maxHeight}</div>
            <p>4K解像度まで対応しています</p>
          </div>
          <div class="limit-card recommended">
            <h4>推奨解像度</h4>
            <div class="limit-value">${limits.recommendedResolution}</div>
            <p>最適なパフォーマンスと品質のバランス</p>
          </div>
        </div>
        <div class="aspect-ratios">
          <h4>対応アスペクト比</h4>
          <div class="ratio-grid">
            ${limits.supportedAspectRatios.map(ratio => `
              <div class="ratio-card">
                <div class="ratio-value">${ratio}</div>
                <div class="ratio-description">${this.getAspectRatioDescription(ratio)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="resolution-guide">
          <h4>解像度別の特徴</h4>
          <table class="resolution-table">
            <thead>
              <tr>
                <th>解像度</th>
                <th>名称</th>
                <th>ピクセル数</th>
                <th>用途</th>
                <th>処理速度</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>640×480</td>
                <td>SD</td>
                <td>307,200</td>
                <td>テスト・プレビュー</td>
                <td>高速</td>
              </tr>
              <tr>
                <td>1280×720</td>
                <td>HD</td>
                <td>921,600</td>
                <td>一般的な用途</td>
                <td>標準</td>
              </tr>
              <tr>
                <td>1920×1080</td>
                <td>Full HD</td>
                <td>2,073,600</td>
                <td>高品質解析</td>
                <td>やや低速</td>
              </tr>
              <tr>
                <td>3840×2160</td>
                <td>4K UHD</td>
                <td>8,294,400</td>
                <td>プロフェッショナル</td>
                <td>低速</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // API制限の表示（要件5.4）
  renderApiLimits() {
    if (!this.limitsData?.apiLimits) return '<p>データが利用できません。</p>';

    const limits = this.limitsData.apiLimits;
    
    return `
      <div class="limits-section">
        <h3>API制限</h3>
        <div class="api-limits-grid">
          <div class="api-limit-card">
            <h4>Bedrock API制限</h4>
            <div class="limit-details">
              <div class="limit-item">
                <span class="label">秒間リクエスト数:</span>
                <span class="value">${limits.bedrockRateLimit.requestsPerSecond}</span>
              </div>
              <div class="limit-item">
                <span class="label">分間リクエスト数:</span>
                <span class="value">${limits.bedrockRateLimit.requestsPerMinute}</span>
              </div>
              <div class="limit-item">
                <span class="label">時間リクエスト数:</span>
                <span class="value">${limits.bedrockRateLimit.requestsPerHour}</span>
              </div>
              <div class="limit-item">
                <span class="label">バースト容量:</span>
                <span class="value">${limits.bedrockRateLimit.burstCapacity}</span>
              </div>
            </div>
          </div>
          
          <div class="api-limit-card">
            <h4>S3 API制限</h4>
            <div class="limit-details">
              <div class="limit-item">
                <span class="label">秒間リクエスト数:</span>
                <span class="value">${limits.s3RateLimit.requestsPerSecond}</span>
              </div>
              <div class="limit-item">
                <span class="label">分間リクエスト数:</span>
                <span class="value">${limits.s3RateLimit.requestsPerMinute}</span>
              </div>
              <div class="limit-item">
                <span class="label">時間リクエスト数:</span>
                <span class="value">${limits.s3RateLimit.requestsPerHour}</span>
              </div>
            </div>
          </div>
          
          <div class="api-limit-card">
            <h4>DynamoDB制限</h4>
            <div class="limit-details">
              <div class="limit-item">
                <span class="label">読み取り容量:</span>
                <span class="value">${limits.dynamoDbLimits.readCapacityUnits} RCU</span>
              </div>
              <div class="limit-item">
                <span class="label">書き込み容量:</span>
                <span class="value">${limits.dynamoDbLimits.writeCapacityUnits} WCU</span>
              </div>
              <div class="limit-item">
                <span class="label">アイテムサイズ制限:</span>
                <span class="value">${limits.dynamoDbLimits.itemSizeLimit}</span>
              </div>
              <div class="limit-item">
                <span class="label">クエリ制限:</span>
                <span class="value">${limits.dynamoDbLimits.queryLimit}</span>
              </div>
            </div>
          </div>
          
          <div class="api-limit-card">
            <h4>システム制限</h4>
            <div class="limit-details">
              <div class="limit-item">
                <span class="label">同時解析数:</span>
                <span class="value">${limits.concurrentAnalyses}</span>
              </div>
              <div class="limit-item">
                <span class="label">日次解析制限:</span>
                <span class="value">${limits.dailyAnalysisLimit}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="rate-limit-info">
          <h4>レート制限について</h4>
          <p>API制限に達した場合、システムは自動的に再試行を行います。制限を超過し続ける場合は、しばらく時間をおいてから再度お試しください。</p>
          <div class="rate-limit-tips">
            <h5>制限回避のコツ</h5>
            <ul>
              <li>大きな動画は複数回に分けて処理する</li>
              <li>同時に複数の解析を実行しない</li>
              <li>ピーク時間を避けて処理を実行する</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // 料金情報の表示（要件5.3）
  renderPricingInfo() {
    if (!this.limitsData?.pricingInfo) return '<p>データが利用できません。</p>';

    const pricing = this.limitsData.pricingInfo;
    
    return `
      <div class="limits-section">
        <h3>料金情報</h3>
        <p class="pricing-note">料金は${pricing.currency}建て、${pricing.region}リージョンの概算です。実際の料金は使用量により変動します。</p>
        
        <div class="cost-estimate">
          <h4>解析1回あたりの概算コスト</h4>
          <div class="cost-cards">
            <div class="cost-card">
              <h5>最小コスト</h5>
              <div class="cost-value">$${pricing.estimatedCostPerAnalysis.minimum}</div>
              <p>小さな動画（5分以下、720p）</p>
            </div>
            <div class="cost-card primary">
              <h5>標準コスト</h5>
              <div class="cost-value">$${pricing.estimatedCostPerAnalysis.typical}</div>
              <p>一般的な動画（15分、1080p）</p>
            </div>
            <div class="cost-card">
              <h5>最大コスト</h5>
              <div class="cost-value">$${pricing.estimatedCostPerAnalysis.maximum}</div>
              <p>大きな動画（1時間、4K）</p>
            </div>
          </div>
        </div>
        
        <div class="cost-breakdown">
          <h4>コスト内訳</h4>
          <div class="breakdown-chart">
            <div class="breakdown-item">
              <span class="service">Bedrock (AI解析)</span>
              <span class="cost">$${pricing.estimatedCostPerAnalysis.breakdown.bedrock}</span>
              <div class="percentage">${Math.round(pricing.estimatedCostPerAnalysis.breakdown.bedrock / pricing.estimatedCostPerAnalysis.typical * 100)}%</div>
            </div>
            <div class="breakdown-item">
              <span class="service">S3 (ストレージ)</span>
              <span class="cost">$${pricing.estimatedCostPerAnalysis.breakdown.s3}</span>
              <div class="percentage">${Math.round(pricing.estimatedCostPerAnalysis.breakdown.s3 / pricing.estimatedCostPerAnalysis.typical * 100)}%</div>
            </div>
            <div class="breakdown-item">
              <span class="service">Lambda (処理)</span>
              <span class="cost">$${pricing.estimatedCostPerAnalysis.breakdown.lambda}</span>
              <div class="percentage">${Math.round(pricing.estimatedCostPerAnalysis.breakdown.lambda / pricing.estimatedCostPerAnalysis.typical * 100)}%</div>
            </div>
            <div class="breakdown-item">
              <span class="service">DynamoDB (データベース)</span>
              <span class="cost">$${pricing.estimatedCostPerAnalysis.breakdown.dynamoDb}</span>
              <div class="percentage">${Math.round(pricing.estimatedCostPerAnalysis.breakdown.dynamoDb / pricing.estimatedCostPerAnalysis.typical * 100)}%</div>
            </div>
          </div>
        </div>
        
        <div class="detailed-pricing">
          <h4>詳細料金表</h4>
          <div class="pricing-tables">
            <div class="pricing-table">
              <h5>S3 ストレージ</h5>
              <table>
                <tr><td>Standard</td><td>$${pricing.s3Storage.standardPerGB}/GB/月</td></tr>
                <tr><td>Standard-IA</td><td>$${pricing.s3Storage.standardIAPerGB}/GB/月</td></tr>
                <tr><td>Glacier</td><td>$${pricing.s3Storage.glacierPerGB}/GB/月</td></tr>
                <tr><td>リクエスト</td><td>$${pricing.s3Storage.requestsPer1000}/1000リクエスト</td></tr>
              </table>
            </div>
            
            <div class="pricing-table">
              <h5>DynamoDB</h5>
              <table>
                <tr><td>読み取り容量</td><td>$${pricing.dynamoDb.readCapacityUnit}/RCU/時間</td></tr>
                <tr><td>書き込み容量</td><td>$${pricing.dynamoDb.writeCapacityUnit}/WCU/時間</td></tr>
                <tr><td>ストレージ</td><td>$${pricing.dynamoDb.storagePerGB}/GB/月</td></tr>
              </table>
            </div>
            
            <div class="pricing-table">
              <h5>Lambda</h5>
              <table>
                <tr><td>リクエスト</td><td>$${pricing.lambda.requestsPer1M}/100万リクエスト</td></tr>
                <tr><td>実行時間</td><td>$${pricing.lambda.gbSecond}/GB秒</td></tr>
              </table>
            </div>
            
            <div class="pricing-table">
              <h5>Bedrock</h5>
              <table>
                <tr><td>Pegasus 1.2</td><td>$${pricing.bedrock.pegasusPerRequest}/リクエスト</td></tr>
                <tr><td>解析あたり</td><td>約${pricing.bedrock.estimatedRequestsPerAnalysis}リクエスト</td></tr>
              </table>
            </div>
          </div>
        </div>
        
        <div class="cost-optimization">
          <h4>コスト最適化のヒント</h4>
          <ul>
            <li><strong>動画を短くする:</strong> 不要な部分をカットして処理時間を短縮</li>
            <li><strong>解像度を調整:</strong> 720pでも十分な解析品質が得られます</li>
            <li><strong>バッチ処理:</strong> 複数の動画をまとめて処理する</li>
            <li><strong>ストレージ管理:</strong> 不要なファイルは定期的に削除</li>
            <li><strong>時間帯を考慮:</strong> ピーク時間を避けて処理を実行</li>
          </ul>
        </div>
        
        <p class="pricing-disclaimer">
          <small>
            ※ 料金は${new Date().toLocaleDateString('ja-JP')}時点の情報です。最新の料金については、AWSの公式料金ページをご確認ください。<br>
            ※ 実際の料金は、使用量、リージョン、為替レートにより変動する場合があります。
          </small>
        </p>
      </div>
    `;
  }

  // アスペクト比の説明を取得
  getAspectRatioDescription(ratio) {
    const descriptions = {
      '16:9': 'ワイドスクリーン（一般的）',
      '4:3': '従来型テレビ',
      '21:9': 'ウルトラワイド',
      '1:1': 'スクエア（SNS用）',
      '9:16': '縦型（モバイル用）'
    };
    return descriptions[ratio] || '対応済み';
  }
}

// グローバルに公開
window.LimitsDisplay = LimitsDisplay;