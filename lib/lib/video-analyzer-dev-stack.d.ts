import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VideoAnalyzerStack } from './video-analyzer-stack';
export declare class VideoAnalyzerDevStack extends VideoAnalyzerStack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
