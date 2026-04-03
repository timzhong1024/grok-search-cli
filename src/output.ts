import type {
  SearchResultPayload,
  StreamResult,
  UsageLike,
  VerbosePayload,
} from "./types";

export function buildVerbosePayload({
  model,
  finishReason,
  requestApi,
  baseUrl,
  durationMs,
  firstTokenLatencyMs,
  usage,
}: {
  model: string;
  finishReason: string;
  requestApi: string;
  baseUrl?: string;
  durationMs: number;
  firstTokenLatencyMs?: number;
  usage: unknown;
}): VerbosePayload {
  const normalizedUsage = (usage ?? {}) as UsageLike;
  const outputTokens = normalizedUsage.outputTokens;
  const reasoningTokens = normalizedUsage.outputTokenDetails?.reasoningTokens;
  const tokensPerSecond =
    typeof outputTokens === "number" && durationMs > 0
      ? Number(((outputTokens * 1000) / durationMs).toFixed(2))
      : undefined;

  return {
    model,
    finishReason,
    requestApi,
    baseUrl,
    durationMs,
    firstTokenLatencyMs,
    tokensPerSecond,
    usage: {
      inputTokens: normalizedUsage.inputTokens,
      outputTokens,
      reasoningTokens,
      totalTokens: normalizedUsage.totalTokens,
    },
  };
}

function printVerbose(verbose: VerbosePayload) {
  process.stdout.write("\nVerbose:\n");
  process.stdout.write(`Model: ${verbose.model}\n`);
  process.stdout.write(`Finish reason: ${verbose.finishReason}\n`);
  process.stdout.write(`Request API: ${verbose.requestApi}\n`);
  if (verbose.baseUrl) {
    process.stdout.write(`Base URL: ${verbose.baseUrl}\n`);
  }

  const durationLine = [`Duration: ${(verbose.durationMs / 1000).toFixed(2)}s`];
  if (verbose.firstTokenLatencyMs != null) {
    durationLine.push(
      `first token ${(verbose.firstTokenLatencyMs / 1000).toFixed(2)}s`,
    );
  }
  process.stdout.write(`${durationLine.join(", ")}\n`);

  const usageParts = [
    verbose.usage.inputTokens != null
      ? `input=${verbose.usage.inputTokens}`
      : undefined,
    verbose.usage.outputTokens != null
      ? `output=${verbose.usage.outputTokens}`
      : undefined,
    verbose.usage.reasoningTokens != null
      ? `reasoning=${verbose.usage.reasoningTokens}`
      : undefined,
    verbose.usage.totalTokens != null
      ? `total=${verbose.usage.totalTokens}`
      : undefined,
  ].filter(Boolean);

  if (usageParts.length > 0) {
    process.stdout.write(`Usage: ${usageParts.join(", ")}\n`);
  }

  if (verbose.tokensPerSecond != null) {
    process.stdout.write(`TPS: ${verbose.tokensPerSecond}\n`);
  }
}

export function printPretty(payload: SearchResultPayload) {
  process.stdout.write(`${payload.text}\n`);

  if (payload.verbose) {
    printVerbose(payload.verbose);
  }
}

export async function streamPretty(params: {
  stream: StreamResult;
  payload: Omit<
    SearchResultPayload,
    "text" | "finishReason" | "usage" | "sources" | "verbose"
  >;
  includeVerbose: boolean;
  requestApi: string;
  baseUrl?: string;
  startedAt: number;
}) {
  let sawOutput = false;
  let endedWithNewline = false;
  let firstTokenLatencyMs: number | undefined;

  for await (const chunk of params.stream.textStream) {
    if (firstTokenLatencyMs == null) {
      firstTokenLatencyMs = Date.now() - params.startedAt;
    }
    sawOutput = true;
    endedWithNewline = chunk.endsWith("\n");
    process.stdout.write(chunk);
  }

  if (!sawOutput || !endedWithNewline) {
    process.stdout.write("\n");
  }

  const usage = await params.stream.usage;
  const finishReason = (await params.stream.finishReason) ?? "unknown";
  const payload: SearchResultPayload = {
    ...params.payload,
    text: await params.stream.text,
    finishReason,
    usage: usage ?? null,
    sources: (await params.stream.sources) ?? [],
    verbose: params.includeVerbose
      ? buildVerbosePayload({
          model: params.payload.model,
          finishReason,
          requestApi: params.requestApi,
          baseUrl: params.baseUrl,
          durationMs: Date.now() - params.startedAt,
          firstTokenLatencyMs,
          usage,
        })
      : undefined,
  };

  process.stdout.write("\n");
  printPretty(payload);
}
