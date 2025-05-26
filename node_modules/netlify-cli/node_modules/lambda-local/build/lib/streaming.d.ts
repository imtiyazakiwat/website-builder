/**
 * Implements Lambda Response Streaming by polyfilling
 * `awslambda.streamifyResponse` and `awslambda.HttpResponseStream.from`.
 *
 * If they're used, `execute` will return a `ReadableStream` as `body`.
 *
 * See https://aws.amazon.com/fr/blogs/compute/introducing-aws-lambda-response-streaming/ for reference.
 */
export {};
