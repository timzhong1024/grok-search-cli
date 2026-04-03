export type UtilityCommandName = "skill";
export type SearchCommandName = "all";
export type CommandName = SearchCommandName | UtilityCommandName;
export type ApiMode = "responses" | "completion";
export type ProviderKind = "xai" | "openrouter" | "third-party";

export interface CliOptions {
  model: string;
  timeoutMs: number;
  json: boolean;
  verbose: boolean;
  allowedDomains: string[];
  excludedDomains: string[];
  allowedHandles: string[];
  excludedHandles: string[];
  fromDate?: string;
  toDate?: string;
  enableImageUnderstanding: boolean;
  enableVideoUnderstanding: boolean;
}

export type ParsedArgs =
  | { command: "skill" }
  | { command: SearchCommandName; prompt: string; options: CliOptions };

export interface UsageLike {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  outputTokenDetails?: {
    reasoningTokens?: number;
    textTokens?: number;
  };
}

export interface VerbosePayload {
  model: string;
  finishReason: string;
  requestApi: string;
  baseUrl?: string;
  durationMs: number;
  firstTokenLatencyMs?: number;
  tokensPerSecond?: number;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };
}

export interface SearchResultPayload {
  command: SearchCommandName;
  apiMode: ApiMode;
  model: string;
  prompt: string;
  text: string;
  finishReason: string;
  usage: unknown;
  sources: unknown[];
  verbose?: VerbosePayload;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
  text: PromiseLike<string>;
  finishReason: PromiseLike<string | undefined>;
  usage: PromiseLike<unknown>;
  sources: PromiseLike<unknown[]>;
}

export interface CompletedResult {
  text: string;
  finishReason?: string;
  usage: unknown;
  sources: unknown[];
}

export interface OpenRouterResponsesOutputTextAnnotation {
  type?: string;
  url?: string;
  start_index?: number;
  end_index?: number;
}

export interface OpenRouterResponsesOutputText {
  type?: string;
  text?: string;
  annotations?: OpenRouterResponsesOutputTextAnnotation[];
}

export interface OpenRouterResponsesOutputItem {
  type?: string;
  role?: string;
  content?: OpenRouterResponsesOutputText[];
}

export interface OpenRouterResponsesUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterResponsesBody {
  model?: string;
  status?: string;
  output?: OpenRouterResponsesOutputItem[];
  usage?: OpenRouterResponsesUsage;
}
