import type { ApiMode, ProviderKind } from "./types";

export const DEFAULT_MODEL =
  process.env.XAI_MODEL?.trim() || "grok-4-1-fast-non-reasoning";
export const CUSTOM_BASE_URL = process.env.XAI_BASE_URL?.trim();
const COMPAT_MODE_SETTING = process.env.XAI_COMPAT_MODE?.trim();

export function getBaseUrl() {
  return CUSTOM_BASE_URL || undefined;
}

export function isOpenRouterBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl) {
    return false;
  }

  try {
    const { hostname } = new URL(baseUrl);
    return hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai");
  } catch {
    return false;
  }
}

export function getProviderKind(baseUrl: string | undefined): ProviderKind {
  if (!baseUrl) {
    return "xai";
  }

  if (isOpenRouterBaseUrl(baseUrl)) {
    return "openrouter";
  }

  try {
    const { hostname } = new URL(baseUrl);
    if (hostname === "x.ai" || hostname.endsWith(".x.ai")) {
      return "xai";
    }
  } catch {
    // fall through
  }

  return "third-party";
}

export function getApiMode(): ApiMode {
  const compatModeEnabled =
    getProviderKind(CUSTOM_BASE_URL) !== "openrouter" &&
    /^(1|true|yes|on)$/i.test(COMPAT_MODE_SETTING || "");

  return compatModeEnabled ? "completion" : "responses";
}

export function getRequestApiLabel(apiMode: ApiMode) {
  const providerKind = getProviderKind(CUSTOM_BASE_URL);
  if (providerKind === "openrouter" && apiMode === "responses") {
    return "OpenRouter Responses API Beta";
  }

  return apiMode === "responses"
    ? "xAI Responses API"
    : "OpenAI-compatible /chat/completions";
}

export function printGatewayError(providerKind: ProviderKind, apiMode: ApiMode) {
  if (providerKind === "xai") {
    console.error(
      apiMode === "responses"
        ? "xAI Responses API request failed. Check XAI_API_KEY, model name, and search parameters."
        : "xAI-compatible completion request failed. Check XAI_API_KEY, model name, and gateway settings.",
    );
    return;
  }

  if (providerKind === "openrouter") {
    console.error(
      "OpenRouter request failed. This CLI uses OpenRouter Responses API web search for openrouter.ai endpoints.",
    );
    return;
  }

  console.error(
    "Third-party gateway request failed. Verify the gateway supports the selected API shape and that web search is enabled on the provider side.",
  );
}
