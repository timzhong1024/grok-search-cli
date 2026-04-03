import { type ToolSet } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai, xai } from "@ai-sdk/xai";
import { isOpenRouterBaseUrl } from "./config";
import { buildOpenRouterRequestTransform } from "./openrouter";
import type { SearchOptions } from "./types";

interface ProviderRuntimeConfig {
  apiKey?: string;
  baseUrl?: string;
}

export function buildTools(options: SearchOptions): ToolSet {
  return {
    web_search: xai.tools.webSearch({
      allowedDomains:
        options.allowedDomains.length > 0 ? options.allowedDomains : undefined,
      excludedDomains:
        options.excludedDomains.length > 0 ? options.excludedDomains : undefined,
      enableImageUnderstanding: options.enableImageUnderstanding || undefined,
    }),
    x_search: xai.tools.xSearch({
      allowedXHandles:
        options.allowedHandles.length > 0 ? options.allowedHandles : undefined,
      excludedXHandles:
        options.excludedHandles.length > 0 ? options.excludedHandles : undefined,
      fromDate: options.fromDate,
      toDate: options.toDate,
      enableImageUnderstanding: options.enableImageUnderstanding || undefined,
      enableVideoUnderstanding: options.enableVideoUnderstanding || undefined,
    }),
  };
}

export function getResponsesProvider(runtimeConfig: ProviderRuntimeConfig) {
  const { baseUrl } = runtimeConfig;
  if (!baseUrl) {
    return xai;
  }

  return createXai({
    baseURL: baseUrl,
  });
}

export function getCompletionProvider(
  runtimeConfig: ProviderRuntimeConfig,
  options: SearchOptions,
) {
  const { baseUrl, apiKey } = runtimeConfig;
  return createOpenAICompatible({
    name: "compat",
    apiKey,
    baseURL: baseUrl || "https://api.x.ai/v1",
    transformRequestBody: isOpenRouterBaseUrl(baseUrl)
      ? buildOpenRouterRequestTransform(options)
      : undefined,
  });
}

export function hasToolSpecificOptions(options: SearchOptions) {
  return (
    options.allowedDomains.length > 0 ||
    options.excludedDomains.length > 0 ||
    options.allowedHandles.length > 0 ||
    options.excludedHandles.length > 0 ||
    typeof options.fromDate === "string" ||
    typeof options.toDate === "string" ||
    options.enableImageUnderstanding ||
    options.enableVideoUnderstanding
  );
}

export function hasOpenRouterUnsupportedSearchOptions(options: SearchOptions) {
  return (
    options.allowedHandles.length > 0 ||
    options.excludedHandles.length > 0 ||
    typeof options.fromDate === "string" ||
    typeof options.toDate === "string" ||
    options.enableImageUnderstanding ||
    options.enableVideoUnderstanding
  );
}
