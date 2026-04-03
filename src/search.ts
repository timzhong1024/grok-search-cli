import { generateText, streamText } from "ai";
import {
  CONFIG_PATH,
  ensureUserConfigFile,
  getApiMode,
  getProviderKind,
  getRequestApiLabel,
  isOpenRouterBaseUrl,
  resolveRuntimeConfig,
} from "./config";
import { fetchOpenRouterResponses, streamOpenRouterResponses } from "./openrouter";
import { buildVerbosePayload } from "./output";
import {
  buildTools,
  getCompletionProvider,
  getResponsesProvider,
  hasOpenRouterUnsupportedSearchOptions,
  hasToolSpecificOptions,
} from "./providers";
import type {
  ApiMode,
  CompletedResult,
  GrokSearchConfig,
  SearchOptions,
  SearchResultPayload,
  StreamResult,
} from "./types";

export interface SearchExecutionContext {
  prompt: string;
  runtimeConfig: ReturnType<typeof resolveRuntimeConfig>;
  apiMode: ApiMode;
  requestApi: string;
  providerKind: ReturnType<typeof getProviderKind>;
  options: SearchOptions;
  startedAt: number;
  abortSignal: AbortSignal;
}

const DEFAULT_MODEL = "grok-4-1-fast-non-reasoning";

export function createDefaultSearchOptions(model = DEFAULT_MODEL): SearchOptions {
  return {
    model,
    timeoutMs: 60_000,
    verbose: false,
    allowedDomains: [],
    excludedDomains: [],
    allowedHandles: [],
    excludedHandles: [],
    enableImageUnderstanding: false,
    enableVideoUnderstanding: false,
  };
}

export function createSearchOptions(config: GrokSearchConfig): SearchOptions {
  const runtimeConfig = resolveRuntimeConfig(config);
  const defaults = createDefaultSearchOptions(runtimeConfig.model);

  return {
    ...defaults,
    model: config.model?.trim() || defaults.model,
    timeoutMs: config.timeoutMs ?? defaults.timeoutMs,
    verbose: config.verbose ?? defaults.verbose,
    allowedDomains: config.allowedDomains ?? defaults.allowedDomains,
    excludedDomains: config.excludedDomains ?? defaults.excludedDomains,
    allowedHandles: config.allowedHandles ?? defaults.allowedHandles,
    excludedHandles: config.excludedHandles ?? defaults.excludedHandles,
    fromDate: config.fromDate,
    toDate: config.toDate,
    enableImageUnderstanding:
      config.enableImageUnderstanding ?? defaults.enableImageUnderstanding,
    enableVideoUnderstanding:
      config.enableVideoUnderstanding ?? defaults.enableVideoUnderstanding,
  };
}

function ensureExplicitApiKey(config: GrokSearchConfig) {
  const runtimeConfig = resolveRuntimeConfig(config);
  if (!runtimeConfig.apiKey) {
    throw new Error("Missing XAI_API_KEY in grokSearch config.");
  }

  return runtimeConfig.apiKey;
}

export function ensureLocalApiKey() {
  const runtimeConfig = resolveRuntimeConfig();
  if (!runtimeConfig.apiKey) {
    const configPath = ensureUserConfigFile();
    throw new Error(
      `Missing XAI_API_KEY.\n\nEdit ${configPath} or set XAI_API_KEY in your shell environment.\nThis CLI reads credentials from process.env first, then ${CONFIG_PATH}.`,
    );
  }

  return runtimeConfig.apiKey;
}

export function shouldWarnAboutCompatFilters(
  apiMode: ApiMode,
  baseUrl: string | undefined,
  options: SearchOptions,
) {
  return (
    apiMode === "completion" &&
    hasToolSpecificOptions(options) &&
    !isOpenRouterBaseUrl(baseUrl)
  );
}

export function shouldUseOpenRouterResponses(
  apiMode: ApiMode,
  providerKind: ReturnType<typeof getProviderKind>,
) {
  return providerKind === "openrouter" && apiMode === "responses";
}

export function getWarnings(
  apiMode: ApiMode,
  baseUrl: string | undefined,
  options: SearchOptions,
) {
  const providerKind = getProviderKind(baseUrl);
  const warnings: string[] = [];

  if (shouldWarnAboutCompatFilters(apiMode, baseUrl, options)) {
    warnings.push(
      "Warning: compatibility mode is enabled, so tool-specific filters are not forwarded. Remove XAI_COMPAT_MODE to use xAI Responses API.",
    );
  }

  if (
    shouldUseOpenRouterResponses(apiMode, providerKind) &&
    hasOpenRouterUnsupportedSearchOptions(options)
  ) {
    warnings.push(
      "Warning: OpenRouter server-tool mode currently forwards web domain filters only. X-specific filters such as handles, dates, image, and video options are ignored.",
    );
  }

  return warnings;
}

function buildExecutionContext(
  prompt: string,
  runtimeConfig: ReturnType<typeof resolveRuntimeConfig>,
  options: SearchOptions,
  apiMode: ApiMode,
): SearchExecutionContext {
  return {
    prompt,
    runtimeConfig,
    apiMode,
    requestApi: getRequestApiLabel(apiMode, runtimeConfig.baseUrl),
    providerKind: getProviderKind(runtimeConfig.baseUrl),
    options,
    startedAt: Date.now(),
    abortSignal: AbortSignal.timeout(options.timeoutMs),
  };
}

export function createExecutionContext(
  prompt: string,
  config: GrokSearchConfig,
): SearchExecutionContext {
  if (!config) {
    throw new Error("grokSearch requires an explicit config object.");
  }
  ensureExplicitApiKey(config);
  const runtimeConfig = resolveRuntimeConfig(config);
  const options = createSearchOptions(config);
  const apiMode = getApiMode(config);
  return buildExecutionContext(prompt, runtimeConfig, options, apiMode);
}

export function createLocalExecutionContext(
  prompt: string,
  options: SearchOptions,
): SearchExecutionContext {
  ensureLocalApiKey();
  const runtimeConfig = resolveRuntimeConfig();
  const apiMode = getApiMode();
  return buildExecutionContext(prompt, runtimeConfig, options, apiMode);
}

export function createPayload(params: {
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

function buildSdkStream(params: SearchExecutionContext): StreamResult {
  if (params.apiMode === "responses") {
    const result = streamText({
      model: getResponsesProvider(params.runtimeConfig).responses(params.options.model),
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
    model: getCompletionProvider(params.runtimeConfig, params.options)(
      params.options.model,
    ),
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

async function runSdkRequest(
  params: SearchExecutionContext,
): Promise<CompletedResult> {
  if (params.apiMode === "responses") {
    const result = await generateText({
      model: getResponsesProvider(params.runtimeConfig).responses(params.options.model),
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
    model: getCompletionProvider(params.runtimeConfig, params.options)(
      params.options.model,
    ),
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

export async function runStreamRequest(params: SearchExecutionContext) {
  return shouldUseOpenRouterResponses(params.apiMode, params.providerKind)
    ? streamOpenRouterResponses({
        prompt: params.prompt,
        options: params.options,
        baseUrl: params.runtimeConfig.baseUrl || "https://openrouter.ai/api/v1",
        apiKey: params.runtimeConfig.apiKey!,
        abortSignal: params.abortSignal,
      })
    : buildSdkStream(params);
}

export async function runSearchRequest(
  params: SearchExecutionContext,
): Promise<CompletedResult> {
  return shouldUseOpenRouterResponses(params.apiMode, params.providerKind)
    ? fetchOpenRouterResponses({
        prompt: params.prompt,
        options: params.options,
        baseUrl: params.runtimeConfig.baseUrl || "https://openrouter.ai/api/v1",
        apiKey: params.runtimeConfig.apiKey!,
        abortSignal: params.abortSignal,
      })
    : runSdkRequest(params);
}

export async function grokSearch(
  query: string,
  config: GrokSearchConfig,
): Promise<SearchResultPayload> {
  if (!config) {
    throw new Error("grokSearch requires an explicit config object.");
  }
  const params = createExecutionContext(query, config);
  const result = await runSearchRequest(params);

  return createPayload({
    command: "all",
    apiMode: params.apiMode,
    model: params.options.model,
    prompt: params.prompt,
    result,
    verbose: params.options.verbose,
    requestApi: params.requestApi,
    baseUrl: params.runtimeConfig.baseUrl,
    startedAt: params.startedAt,
  });
}
