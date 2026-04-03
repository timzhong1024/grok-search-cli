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

function withStreamingUsage(body: Record<string, unknown>) {
  if (body.stream !== true) {
    return body;
  }

  return {
    ...body,
    stream_options: {
      ...(typeof body.stream_options === "object" && body.stream_options != null
        ? (body.stream_options as Record<string, unknown>)
        : {}),
      include_usage: true,
    },
  };
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
  const openRouterTransform = isOpenRouterBaseUrl(baseUrl)
    ? buildOpenRouterRequestTransform(options)
    : undefined;

  return createOpenAICompatible({
    name: "compat",
    apiKey,
    baseURL: baseUrl || "https://api.x.ai/v1",
    transformRequestBody: (body) =>
      withStreamingUsage(
        (openRouterTransform ? openRouterTransform(body) : body) as Record<
          string,
          unknown
        >,
      ),
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
