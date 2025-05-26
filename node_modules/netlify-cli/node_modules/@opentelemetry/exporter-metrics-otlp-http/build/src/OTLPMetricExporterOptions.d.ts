import { AggregationTemporality } from '@opentelemetry/sdk-metrics';
import { OTLPExporterConfigBase } from '@opentelemetry/otlp-exporter-base';
export interface OTLPMetricExporterOptions extends OTLPExporterConfigBase {
    temporalityPreference?: AggregationTemporality;
}
//# sourceMappingURL=OTLPMetricExporterOptions.d.ts.map