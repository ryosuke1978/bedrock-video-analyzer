import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VideoAnalyzerStack } from './video-analyzer-stack';

export class VideoAnalyzerDevStack extends VideoAnalyzerStack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 開発環境固有の設定をここに追加
    // 例：より短いライフサイクル、小さなリソースサイズなど
    
    // 開発環境用のタグを追加
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'BedrockVideoAnalyzer');
    cdk.Tags.of(this).add('Owner', 'Development Team');
  }
}