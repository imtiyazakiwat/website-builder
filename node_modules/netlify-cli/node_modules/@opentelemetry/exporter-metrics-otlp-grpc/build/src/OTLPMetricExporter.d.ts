import { OTLPMetricExporterBase, OTLPMetricExporterOptions } from '@opentelemetry/exporter-metrics-otlp-http';
import { ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { OTLPGRPCExporterConfigNode, OTLPGRPCExporterNodeBase, ServiceClientType } from '@opentelemetry/otlp-grpc-exporter-base';
import { IExportMetricsServiceRequest } from '@opentelemetry/otlp-transformer';
declare class OTLPMetricExporterProxy extends OTLPGRPCExporterNodeBase<ResourceMetrics, IExportMetricsServiceRequest> {
    constructor(config?: OTLPGRPCExporterConfigNode & OTLPMetricExporterOptions);
    getServiceProtoPath(): string;
    getServiceClientType(): ServiceClientType;
    getDefaultUrl(config: OTLPGRPCExporterConfigNode): string;
    convert(metrics: ResourceMetrics[]): IExportMetricsServiceRequest;
    getUrlFromConfig(config: OTLPGRPCExporterConfigNode): string;
}
/**
 * OTLP-gRPC metric exporter
 */
export declare class OTLPMetricExporter extends OTLPMetricExporterBase<OTLPMetricExporterProxy> {
    constructor(config?: OTLPGRPCExporterConfigNode & OTLPMetricExporterOptions);
}
export {};
//# sourceMappingURL=OTLPMetricExporter.d.ts.map