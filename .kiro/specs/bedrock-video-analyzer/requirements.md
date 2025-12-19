# 要件文書

## 概要

Amazon Bedrock の TwelveLabs Pegasus 1.2 を使用した動画解析デモWebアプリケーションです。このアプリケーションは、ユーザーがアップロードした動画に対してPegasus 1.2の様々な機能を試すことができるデモンストレーション環境を提供します。

## 用語集

- **Pegasus_1_2**: TwelveLabsが開発した動画理解・解析AIモデル
- **Video_Analyzer**: 動画解析を行うWebアプリケーション
- **Upload_Interface**: 動画ファイルをアップロードするためのユーザーインターフェース
- **Analysis_Engine**: Pegasus 1.2を使用して動画解析を実行するバックエンドシステム
- **Result_Display**: 解析結果を表示するフロントエンドコンポーネント
- **AWS_Lambda**: サーバーレス関数実行環境
- **Amazon_S3**: 動画ファイル保存用オブジェクトストレージ
- **Amazon_Bedrock**: 生成AIサービスプラットフォーム

## 要件

### 要件 1

**ユーザーストーリー:** ユーザーとして、動画ファイルをアップロードして解析したいので、簡単で直感的なアップロード機能が欲しい

#### 受け入れ基準

1. WHEN ユーザーが動画ファイルを選択する THEN Upload_Interface SHALL 対応フォーマット（MP4、MOV、AVI、MKV、WEBM、MXF、FLV、WMV、M4V）のファイルのみを受け入れる
2. WHEN ユーザーが制限を超えるファイルサイズの動画をアップロードしようとする THEN Upload_Interface SHALL エラーメッセージを表示し、アップロードを拒否する
3. WHEN 動画のアップロードが開始される THEN Upload_Interface SHALL 進行状況を視覚的に表示する
4. WHEN 動画のアップロードが完了する THEN Upload_Interface SHALL 成功メッセージを表示し、解析開始ボタンを有効化する
5. WHEN ユーザーが無効な動画ファイルをアップロードしようとする THEN Upload_Interface SHALL 適切なエラーメッセージを表示する

### 要件 2

**ユーザーストーリー:** ユーザーとして、動画の包括的な解析結果を得たいので、基本解析、PR文章、あらすじを自動で生成する機能が欲しい

#### 受け入れ基準

1. WHEN ユーザーが動画解析を開始する THEN Analysis_Engine SHALL 基本解析、PR文章生成、あらすじ生成を必須で実行する
2. WHEN 動画解析が実行される THEN Analysis_Engine SHALL 全ての必須機能を並行して処理する
3. WHEN 解析処理が開始される THEN Video_Analyzer SHALL 実行される機能（基本解析、PR文章生成、あらすじ生成）を明示する
4. WHEN 解析が完了する THEN Video_Analyzer SHALL 全ての必須機能の結果を統合して表示する
5. WHEN 解析機能に制限がある場合 THEN Video_Analyzer SHALL 制限内容を事前に明示する

### 要件 3

**ユーザーストーリー:** ユーザーとして、動画解析の進行状況を把握したいので、リアルタイムで処理状況が分かる機能が欲しい

#### 受け入れ基準

1. WHEN 動画解析が開始される THEN Video_Analyzer SHALL 解析の進行状況をパーセンテージで表示する
2. WHEN 解析処理中にエラーが発生する THEN Analysis_Engine SHALL エラー内容を詳細に報告する
3. WHEN 解析が完了する THEN Video_Analyzer SHALL 完了通知を表示し、結果表示画面に遷移する
4. WHEN 解析処理が長時間実行される THEN Video_Analyzer SHALL 推定残り時間を表示する
5. WHEN ユーザーが解析をキャンセルする THEN Analysis_Engine SHALL 処理を安全に停止し、リソースを解放する

### 要件 4

**ユーザーストーリー:** ユーザーとして、解析結果を分かりやすく確認したいので、構造化された結果表示機能が欲しい

#### 受け入れ基準

1. WHEN 解析が完了する THEN Result_Display SHALL 解析結果を機能別にカテゴリ分けして表示する
2. WHEN 解析結果にテキスト情報が含まれる THEN Result_Display SHALL テキストを日本語で読みやすい形式で表示する
3. WHEN 解析結果に時系列データが含まれる THEN Result_Display SHALL タイムライン形式で表示する
4. WHEN 解析結果に信頼度スコアが含まれる THEN Result_Display SHALL スコアを視覚的に表示する
5. WHEN ユーザーが結果をエクスポートする THEN Result_Display SHALL JSON形式でダウンロード機能を提供する

### 要件 5

**ユーザーストーリー:** ユーザーとして、動画ファイルの制限事項を事前に知りたいので、制限情報を明確に表示する機能が欲しい

#### 受け入れ基準

1. WHEN ユーザーがアプリケーションにアクセスする THEN Video_Analyzer SHALL 対応動画形式（MP4、MOV、AVI、MKV、WEBM、MXF、FLV、WMV、M4V）の一覧を表示する
2. WHEN ユーザーが制限情報を確認する THEN Video_Analyzer SHALL 最大ファイルサイズ、最大動画長、解像度制限を表示する
3. WHEN ユーザーが料金情報を確認する THEN Video_Analyzer SHALL 解析機能ごとの概算コストを表示する
4. WHEN ユーザーがAPI制限を確認する THEN Video_Analyzer SHALL レート制限とクォータ情報を表示する
5. WHEN 制限事項が更新される THEN Video_Analyzer SHALL 最新の制限情報を動的に取得し表示する

### 要件 6

**ユーザーストーリー:** ユーザーとして、動画のマーケティング用文章を自動生成したいので、PR文章とあらすじ作成機能が欲しい

#### 受け入れ基準

1. WHEN 動画解析が完了する THEN Analysis_Engine SHALL 200文字のPR文章を自動生成する
2. WHEN 動画解析が完了する THEN Analysis_Engine SHALL 500文字のPR文章を自動生成する
3. WHEN PR文章が生成される THEN Analysis_Engine SHALL ネタバレを避けつつ視聴者の興味を引く内容にする
4. WHEN 動画解析が完了する THEN Analysis_Engine SHALL 200文字のあらすじを自動生成する
5. WHEN 動画解析が完了する THEN Analysis_Engine SHALL 500文字のあらすじを自動生成する
6. WHEN あらすじが生成される THEN Analysis_Engine SHALL 動画の状況を端的に説明する内容にする
7. WHEN PR文章とあらすじが表示される THEN Result_Display SHALL それぞれを明確に区別して表示する
8. WHEN ユーザーがPR文章やあらすじをコピーする THEN Result_Display SHALL ワンクリックでコピー機能を提供する

### 要件 7

**ユーザーストーリー:** ユーザーとして、解析完了後に動画について詳細な質問をしたいので、オプションの対話型問い合わせ機能が欲しい

#### 受け入れ基準

1. WHEN 基本解析が完了する THEN Video_Analyzer SHALL 自然言語問い合わせフォームを利用可能にする
2. WHEN ユーザーが問い合わせフォームを開く THEN Video_Analyzer SHALL 自然言語入力フィールドと質問例を表示する
3. WHEN ユーザーが「動画の内容をまとめてほしい」と入力する THEN Analysis_Engine SHALL 動画の要約を生成し表示する
4. WHEN ユーザーが「動画をシーンごとに内容をまとめてほしい」と入力する THEN Analysis_Engine SHALL シーン別の詳細分析を提供する
5. WHEN ユーザーが「インタビュー内容を文字起こししてほしい」と入力する THEN Analysis_Engine SHALL 音声の文字起こし結果を表示する
6. WHEN ユーザーが動画の特定の部分について質問する THEN Analysis_Engine SHALL 該当する時間帯の情報を含めて回答する
7. WHEN ユーザーが複数の質問を連続で行う THEN Video_Analyzer SHALL 質問履歴を保持し、文脈を考慮した回答を提供する
8. WHEN 問い合わせに対する回答が生成される THEN Analysis_Engine SHALL 回答の信頼度と根拠となる動画の時間帯を併せて表示する

### 要件 8

**ユーザーストーリー:** ユーザーとして、解析結果を日本語で理解したいので、多言語対応機能が欲しい

#### 受け入れ基準

1. WHEN 解析結果が英語で返される THEN Analysis_Engine SHALL 結果を日本語に翻訳する
2. WHEN UIにテキストが表示される THEN Video_Analyzer SHALL 全てのインターフェースを日本語で表示する
3. WHEN エラーメッセージが表示される THEN Video_Analyzer SHALL エラー内容を日本語で説明する
4. WHEN 解析機能の説明が表示される THEN Video_Analyzer SHALL 機能説明を日本語で提供する
5. WHEN 制限事項が表示される THEN Video_Analyzer SHALL 制限内容を日本語で明記する
6. WHEN 自然言語問い合わせが行われる THEN Analysis_Engine SHALL 日本語での質問を理解し、日本語で回答する
7. WHEN PR文章とあらすじが生成される THEN Analysis_Engine SHALL 全て日本語で生成する

### 要件 9

**ユーザーストーリー:** システム管理者として、アプリケーションが安全で効率的に動作することを確保したいので、適切なセキュリティとパフォーマンス機能が欲しい

#### 受け入れ基準

1. WHEN 動画ファイルがアップロードされる THEN AWS_Lambda SHALL ファイルのウイルススキャンを実行する
2. WHEN 動画ファイルが処理される THEN Amazon_S3 SHALL 暗号化されたストレージに保存する
3. WHEN 解析処理が完了する THEN AWS_Lambda SHALL 一時ファイルを自動的に削除する
4. WHEN 同時アクセス数が制限を超える THEN Video_Analyzer SHALL 適切なエラーメッセージを表示し、待機を促す
5. WHEN システムリソースが不足する THEN Analysis_Engine SHALL 処理を一時停止し、リソース回復を待つ