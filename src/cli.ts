import { generateText, streamText } from "ai";
import { parseArgs, fail } from "./args";
import {
  CONFIG_PATH,
  ensureUserConfigFile,
  getApiKey,
  getApiMode,
  getBaseUrl,
  getConfigDoctorSnapshot,
  getProviderKind,
  getRequestApiLabel,
  isOpenRouterBaseUrl,
  printGatewayError,
} from "./config";
import { fetchOpenRouterResponses, streamOpenRouterResponses } from "./openrouter";
import { buildVerbosePayload, printPretty, streamPretty } from "./output";
import {
  buildTools,
  getCompletionProvider,
  getResponsesProvider,
  hasOpenRouterUnsupportedSearchOptions,
  hasToolSpecificOptions,
} from "./providers";
import { readSkillMarkdown } from "./skill";
import type {
  ApiMode,
  CompletedResult,
  SearchResultPayload,
  StreamResult,
} from "./types";

function printDoctor() {
  const snapshot = getConfigDoctorSnapshot();

  process.stdout.write("Doctor:\n");
  process.stdout.write(`Config path: ${snapshot.configPath}\n`);
  process.stdout.write(
    `API key: ${snapshot.apiKeyPresent ? "present" : "missing"} (${snapshot.sources.apiKey})\n`,
  );
  process.stdout.write(`Model: ${snapshot.model} (${snapshot.sources.model})\n`);
  process.stdout.write(
    `Base URL: ${snapshot.baseUrl ?? "(xAI default)"} (${snapshot.sources.baseUrl})\n`,
  );
  process.stdout.write(
    `Compat mode source: ${snapshot.sources.compatMode}\n`,
  );
  process.stdout.write(`Provider: ${snapshot.providerKind}\n`);
  process.stdout.write(`API mode: ${snapshot.apiMode}\n`);
  process.stdout.write(
    `Status: ${snapshot.apiKeyPresent ? "OK" : "NOT READY"}\n`,
  );

  if (!snapshot.apiKeyPresent) {
    const configPath = ensureUserConfigFile();
    process.stdout.write(`Action: edit ${configPath}\n`);
  }
}

function ensureApiKey() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const configPath = ensureUserConfigFile();
    fail(
      `Missing XAI_API_KEY.\n\nEdit ${configPath} or set XAI_API_KEY in your shell environment.\nThis CLI reads credentials from process.env first, then ${CONFIG_PATH}.`,
    );
  }

  return apiKey;
}

function shouldWarnAboutCompatFilters(apiMode: ApiMode, options: Parameters<typeof hasToolSpecificOptions>[0]) {
  const baseUrl = getBaseUrl();
  return (
    apiMode === "completion" &&
    hasToolSpecificOptions(options) &&
    !isOpenRouterBaseUrl(baseUrl)
  );
}

function shouldWarnAboutOpenRouterUnsupportedOptions(
  apiMode: ApiMode,
  options: Parameters<typeof hasOpenRouterUnsupportedSearchOptions>[0],
) {
  return (
    shouldUseOpenRouterResponses(apiMode) &&
    hasOpenRouterUnsupportedSearchOptions(options)
  );
}

function shouldUseOpenRouterResponses(apiMode: ApiMode) {
  return getProviderKind(getBaseUrl()) === "openrouter" && apiMode === "responses";
}

function shouldStreamPrettyOutput(json: boolean) {
  return process.stdout.isTTY && !json;
}

function createPayload(params: {
  command: "all";
  apiMode: ApiMode;
  model: string;
  prompt: string;
  result: CompletedResult;
  verbose: boolean;
  requestApi: string;
  baseUrl?: string;
  startedAt: number;
}): SearchResultPayload {
  return {
    command: params.command,
    apiMode: params.apiMode,
    model: params.model,
    prompt: params.prompt,
    text: params.result.text,
    finishReason: params.result.finishReason ?? "unknown",
    usage: params.result.usage ?? null,
    sources: params.result.sources ?? [],
    verbose: params.verbose
      ? buildVerbosePayload({
          model: params.model,
          finishReason: params.result.finishReason ?? "unknown",
          requestApi: params.requestApi,
          baseUrl: params.baseUrl,
          durationMs: Date.now() - params.startedAt,
          usage: params.result.usage ?? null,
        })
      : undefined,
  };
}

function buildSdkStream(params: {
  prompt: string;
  model: string;
  apiMode: ApiMode;
  options: Parameters<typeof buildTools>[0];
  abortSignal: AbortSignal;
}): StreamResult {
  if (params.apiMode === "responses") {
    const result = streamText({
      model: getResponsesProvider().responses(params.model),
      prompt: params.prompt,
      tools: buildTools(params.options),
      abortSignal: params.abortSignal,
    });

    return {
      textStream: result.textStream,
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      sources: result.sources,
    };
  }

  const result = streamText({
    model: getCompletionProvider(params.options)(params.model),
    prompt: params.prompt,
    abortSignal: params.abortSignal,
  });

  return {
    textStream: result.textStream,
    text: result.text,
    finishReason: result.finishReason,
    usage: result.usage,
    sources: result.sources,
  };
}

async function runSdkRequest(params: {
  prompt: string;
  model: string;
  apiMode: ApiMode;
  options: Parameters<typeof buildTools>[0];
  abortSignal: AbortSignal;
}): Promise<CompletedResult> {
  if (params.apiMode === "responses") {
    const result = await generateText({
      model: getResponsesProvider().responses(params.model),
      prompt: params.prompt,
      tools: buildTools(params.options),
      abortSignal: params.abortSignal,
    });

    return {
      text: result.text,
      finishReason: result.finishReason ?? "unknown",
      usage: result.usage ?? null,
      sources: result.sources ?? [],
    };
  }

  const result = await generateText({
    model: getCompletionProvider(params.options)(params.model),
    prompt: params.prompt,
    abortSignal: params.abortSignal,
  });

  return {
    text: result.text,
    finishReason: result.finishReason ?? "unknown",
    usage: result.usage ?? null,
    sources: result.sources ?? [],
  };
}

async function runStream(params: {
  prompt: string;
  model: string;
  apiMode: ApiMode;
  options: Parameters<typeof buildTools>[0];
  requestApi: string;
  baseUrl?: string;
  startedAt: number;
  abortSignal: AbortSignal;
  apiKey: string;
}) {
  const stream = shouldUseOpenRouterResponses(params.apiMode)
    ? await streamOpenRouterResponses({
        prompt: params.prompt,
        options: params.options,
        baseUrl: params.baseUrl || "https://openrouter.ai/api/v1",
        apiKey: params.apiKey,
        abortSignal: params.abortSignal,
      })
    : buildSdkStream(params);

  await streamPretty({
    stream,
    payload: {
      command: "all",
      apiMode: params.apiMode,
      model: params.model,
      prompt: params.prompt,
    },
    includeVerbose: params.options.verbose,
    requestApi: params.requestApi,
    baseUrl: params.baseUrl,
    startedAt: params.startedAt,
  });
}

async function runOnce(params: {
  prompt: string;
  model: string;
  apiMode: ApiMode;
  options: Parameters<typeof buildTools>[0];
  requestApi: string;
  baseUrl?: string;
  startedAt: number;
  abortSignal: AbortSignal;
  apiKey: string;
}) {
  const result = shouldUseOpenRouterResponses(params.apiMode)
    ? await fetchOpenRouterResponses({
        prompt: params.prompt,
        options: params.options,
        baseUrl: params.baseUrl || "https://openrouter.ai/api/v1",
        apiKey: params.apiKey,
        abortSignal: params.abortSignal,
      })
    : await runSdkRequest(params);

  const payload = createPayload({
    command: "all",
    apiMode: params.apiMode,
    model: params.model,
    prompt: params.prompt,
    result,
    verbose: params.options.verbose,
    requestApi: params.requestApi,
    baseUrl: params.baseUrl,
    startedAt: params.startedAt,
  });

  if (params.options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  printPretty(payload);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "skill") {
    process.stdout.write(`${readSkillMarkdown()}\n`);
    return;
  }

  if (parsed.command === "doctor") {
    printDoctor();
    return;
  }

  const apiKey = ensureApiKey();
  const apiMode = getApiMode();
  const baseUrl = getBaseUrl();
  const requestApi = getRequestApiLabel(apiMode);
  const startedAt = Date.now();
  const abortSignal = AbortSignal.timeout(parsed.options.timeoutMs);

  if (shouldWarnAboutCompatFilters(apiMode, parsed.options)) {
    console.error(
      "Warning: compatibility mode is enabled, so tool-specific filters are not forwarded. Remove XAI_COMPAT_MODE to use xAI Responses API.",
    );
  }

  if (shouldWarnAboutOpenRouterUnsupportedOptions(apiMode, parsed.options)) {
    console.error(
      "Warning: OpenRouter server-tool mode currently forwards web domain filters only. X-specific filters such as handles, dates, image, and video options are ignored.",
    );
  }

  const runParams = {
    prompt: parsed.prompt,
    model: parsed.options.model,
    apiMode,
    options: parsed.options,
    requestApi,
    baseUrl,
    startedAt,
    abortSignal,
    apiKey,
  };

  if (shouldStreamPrettyOutput(parsed.options.json)) {
    await runStream(runParams);
    return;
  }

  await runOnce(runParams);
}

void main().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  printGatewayError(getProviderKind(getBaseUrl()), getApiMode());
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
