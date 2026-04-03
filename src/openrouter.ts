import pDefer from "p-defer";
import type {
  CompletedResult,
  OpenRouterResponsesBody,
  OpenRouterResponsesUsage,
  SearchOptions,
  StreamResult,
  UsageLike,
} from "./types";

function buildOpenRouterPlugin(options: SearchOptions) {
  const parameters: Record<string, unknown> = {};

  if (options.allowedDomains.length > 0) {
    parameters.allowed_domains = options.allowedDomains;
  }

  if (options.excludedDomains.length > 0) {
    parameters.excluded_domains = options.excludedDomains;
  }

  return hasKeys(parameters)
    ? { type: "openrouter:web_search", parameters }
    : { type: "openrouter:web_search" };
}

function hasKeys(value: Record<string, unknown>) {
  return Object.keys(value).length > 0;
}

export function buildOpenRouterResponsesBody(
  prompt: string,
  options: SearchOptions,
  stream: boolean,
) {
  const body: Record<string, unknown> = {
    model: options.model,
    input: prompt,
    tools: [buildOpenRouterPlugin(options)],
    stream,
  };

  return body;
}

async function expectOpenRouterResponse(response: Response) {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response;
}

function extractOpenRouterText(response: OpenRouterResponsesBody) {
  const message = response.output?.find((item) => item.type === "message");
  const textPart = message?.content?.find((part) => part.type === "output_text");
  return textPart?.text ?? "";
}

function extractOpenRouterSources(response: OpenRouterResponsesBody) {
  const message = response.output?.find((item) => item.type === "message");
  const textPart = message?.content?.find((part) => part.type === "output_text");

  return (
    textPart?.annotations
      ?.filter((annotation) => annotation.type === "url_citation")
      .map((annotation) => ({
        sourceType: "url_citation",
        url: annotation.url,
      })) ?? []
  );
}

function normalizeOpenRouterUsage(
  usage: OpenRouterResponsesUsage | undefined,
): UsageLike {
  return {
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
    totalTokens: usage?.total_tokens,
    outputTokenDetails: {
      textTokens: usage?.output_tokens,
      reasoningTokens: undefined,
    },
  };
}

function toCompletedResult(body: OpenRouterResponsesBody): CompletedResult {
  return {
    text: extractOpenRouterText(body),
    finishReason: body.status ?? "unknown",
    usage: normalizeOpenRouterUsage(body.usage),
    sources: extractOpenRouterSources(body),
  };
}

async function postOpenRouterResponses(params: {
  baseUrl: string;
  apiKey: string;
  body: Record<string, unknown>;
  abortSignal: AbortSignal;
}) {
  const response = await fetch(`${params.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.body),
    signal: params.abortSignal,
  });

  return expectOpenRouterResponse(response);
}

export function buildOpenRouterRequestTransform(options: SearchOptions) {
  return (body: Record<string, unknown>) => {
    return {
      ...body,
      tools: [buildOpenRouterPlugin(options)],
    };
  };
}

type OpenRouterStreamEvent =
  | { type: "ignore" }
  | { type: "done" }
  | { type: "delta"; text: string }
  | { type: "completed"; response: OpenRouterResponsesBody };

export function parseOpenRouterSseLine(line: string): OpenRouterStreamEvent {
  if (!line.startsWith("data: ")) {
    return { type: "ignore" };
  }

  const data = line.slice(6);
  if (data === "[DONE]") {
    return { type: "done" };
  }

  const event = JSON.parse(data) as Record<string, unknown>;
  if (
    event.type === "response.output_text.delta" &&
    typeof event.delta === "string"
  ) {
    return {
      type: "delta",
      text: event.delta,
    };
  }

  if (event.type === "response.completed") {
    return {
      type: "completed",
      response: event.response as OpenRouterResponsesBody,
    };
  }

  return { type: "ignore" };
}

export async function fetchOpenRouterResponses(params: {
  prompt: string;
  options: SearchOptions;
  baseUrl: string;
  apiKey: string;
  abortSignal: AbortSignal;
}): Promise<CompletedResult> {
  const response = await postOpenRouterResponses({
    baseUrl: params.baseUrl,
    apiKey: params.apiKey,
    body: buildOpenRouterResponsesBody(params.prompt, params.options, false),
    abortSignal: params.abortSignal,
  });
  const body = (await response.json()) as OpenRouterResponsesBody;
  return toCompletedResult(body);
}

export async function streamOpenRouterResponses(params: {
  prompt: string;
  options: SearchOptions;
  baseUrl: string;
  apiKey: string;
  abortSignal: AbortSignal;
}): Promise<StreamResult> {
  const response = await postOpenRouterResponses({
    baseUrl: params.baseUrl,
    apiKey: params.apiKey,
    body: buildOpenRouterResponsesBody(params.prompt, params.options, true),
    abortSignal: params.abortSignal,
  });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("OpenRouter streaming response body is missing.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const finalResponse = pDefer<OpenRouterResponsesBody>();
  let sawCompletedEvent = false;
  const textStream = (async function* (): AsyncGenerator<string, void, unknown> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseOpenRouterSseLine(line);

          if (event.type === "delta") {
            yield event.text;
            continue;
          }

          if (event.type === "completed") {
            sawCompletedEvent = true;
            finalResponse.resolve(event.response);
            continue;
          }

          if (event.type === "done") {
            return;
          }
        }
      }

      if (!sawCompletedEvent) {
        finalResponse.reject(
          new Error("OpenRouter stream ended before response.completed."),
        );
      }
    } catch (error) {
      finalResponse.reject(error);
      throw error;
    }
  })();
  const finalResultPromise = finalResponse.promise.then(toCompletedResult);

  return {
    textStream,
    text: finalResultPromise.then((result) => result.text),
    finishReason: finalResultPromise.then((result) => result.finishReason),
    usage: finalResultPromise.then((result) => result.usage),
    sources: finalResultPromise.then((result) => result.sources),
  };
}
