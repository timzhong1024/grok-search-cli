import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Conf from "conf";
import type { ApiMode, GrokSearchConfig, ProviderKind } from "./types";

const FALLBACK_MODEL = "grok-4-1-fast-non-reasoning";
const CONFIG_DIR = path.join(os.homedir(), ".config", "grok-search-cli");
interface UserConfig {
  XAI_API_KEY?: string;
  XAI_MODEL?: string;
  XAI_BASE_URL?: string;
  XAI_COMPAT_MODE?: boolean | string;
  _examples?: {
    xai: {
      XAI_API_KEY: string;
      XAI_MODEL: string;
    };
    openrouter: {
      XAI_API_KEY: string;
      XAI_MODEL: string;
      XAI_BASE_URL: string;
    };
    yunwu: {
      XAI_API_KEY: string;
      XAI_MODEL: string;
      XAI_BASE_URL: string;
      XAI_COMPAT_MODE: boolean;
    };
  };
}

interface RuntimeConfig {
  apiKey?: string;
  model: string;
  baseUrl?: string;
  compatModeRaw?: boolean | string;
}

interface RuntimeConfigSources {
  apiKey: "env" | "config" | "default" | "missing";
  model: "env" | "config" | "default";
  baseUrl: "env" | "config" | "default";
  compatMode: "env" | "config" | "default";
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function createDefaultConfigTemplate(): UserConfig {
  return {
    XAI_API_KEY: "",
    XAI_MODEL: FALLBACK_MODEL,
    XAI_BASE_URL: "",
    XAI_COMPAT_MODE: false,
    _examples: {
      xai: {
        XAI_API_KEY: "your_xai_api_key",
        XAI_MODEL: "grok-4-1-fast-non-reasoning",
      },
      openrouter: {
        XAI_API_KEY: "your_openrouter_api_key",
        XAI_MODEL: "x-ai/grok-4.1-fast",
        XAI_BASE_URL: "https://openrouter.ai/api/v1",
      },
      yunwu: {
        XAI_API_KEY: "your_yunwu_api_key",
        XAI_MODEL: "grok-4-fast",
        XAI_BASE_URL: "https://yunwu.ai/v1",
        XAI_COMPAT_MODE: true,
      },
    },
  };
}

function createUserConfigStore() {
  try {
    return new Conf<UserConfig>({
      projectName: "grok-search-cli",
      configName: "config",
      cwd: CONFIG_DIR,
      defaults: createDefaultConfigTemplate(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize user config: ${message}`);
  }
}

const userConfig = createUserConfigStore();
export const CONFIG_PATH = userConfig.path;

export function ensureUserConfigFile() {
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(
      CONFIG_PATH,
      `${JSON.stringify(createDefaultConfigTemplate(), null, 2)}\n`,
      "utf8",
    );
    try {
      chmodSync(CONFIG_PATH, 0o600);
    } catch {
      // best-effort permission tightening
    }
  }

  return CONFIG_PATH;
}

function getRuntimeConfig(): RuntimeConfig {
  const fileConfig = userConfig.store;

  return {
    apiKey: trimString(process.env.XAI_API_KEY) ?? fileConfig?.XAI_API_KEY,
    model:
      trimString(process.env.XAI_MODEL) ??
      fileConfig?.XAI_MODEL ??
      FALLBACK_MODEL,
    baseUrl:
      trimString(process.env.XAI_BASE_URL) ??
      fileConfig?.XAI_BASE_URL,
    compatModeRaw:
      process.env.XAI_COMPAT_MODE?.trim() ??
      fileConfig?.XAI_COMPAT_MODE,
  };
}

export function resolveRuntimeConfig(config?: GrokSearchConfig): RuntimeConfig {
  if (config) {
    return {
      apiKey: trimString(config.apiKey),
      model: trimString(config.model) ?? FALLBACK_MODEL,
      baseUrl: trimString(config.baseUrl),
      compatModeRaw: config.compatMode,
    };
  }

  return getRuntimeConfig();
}

function getRuntimeConfigSources(): RuntimeConfigSources {
  const fileConfig = userConfig.store;

  return {
    apiKey: trimString(process.env.XAI_API_KEY)
      ? "env"
      : fileConfig?.XAI_API_KEY
        ? "config"
        : "missing",
    model: trimString(process.env.XAI_MODEL)
      ? "env"
      : fileConfig?.XAI_MODEL
        ? "config"
        : "default",
    baseUrl: trimString(process.env.XAI_BASE_URL)
      ? "env"
      : fileConfig?.XAI_BASE_URL
        ? "config"
        : "default",
    compatMode: process.env.XAI_COMPAT_MODE?.trim()
      ? "env"
      : fileConfig?.XAI_COMPAT_MODE != null
        ? "config"
        : "default",
  };
}

export function getDefaultModel() {
  return resolveRuntimeConfig().model;
}

export function getApiKey() {
  return resolveRuntimeConfig().apiKey;
}

export function getBaseUrl() {
  return resolveRuntimeConfig().baseUrl;
}

export function getConfigDoctorSnapshot() {
  const runtimeConfig = getRuntimeConfig();
  const sources = getRuntimeConfigSources();
  const apiMode = getApiMode();
  const providerKind = getProviderKind(runtimeConfig.baseUrl);

  return {
    configPath: CONFIG_PATH,
    apiKeyPresent: Boolean(runtimeConfig.apiKey),
    model: runtimeConfig.model,
    baseUrl: runtimeConfig.baseUrl,
    providerKind,
    apiMode,
    sources,
  };
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

export function isCompatModeEnabled(config?: GrokSearchConfig) {
  const { compatModeRaw, baseUrl } = resolveRuntimeConfig(config);
  return (
    getProviderKind(baseUrl) !== "openrouter" &&
    /^(1|true|yes|on)$/i.test(String(compatModeRaw || ""))
  );
}

export function getApiMode(config?: GrokSearchConfig): ApiMode {
  return isCompatModeEnabled(config) ? "completion" : "responses";
}

export function getRequestApiLabel(
  apiMode: ApiMode,
  baseUrl = getBaseUrl(),
) {
  const providerKind = getProviderKind(baseUrl);
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
