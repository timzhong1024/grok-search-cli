import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenRouterResponsesBody,
  parseOpenRouterSseLine,
} from "./openrouter";
import type { CliOptions } from "./types";

function createOptions(overrides: Partial<CliOptions> = {}): CliOptions {
  return {
    model: "x-ai/grok-4-fast",
    timeoutMs: 60_000,
    json: false,
    verbose: false,
    allowedDomains: [],
    excludedDomains: [],
    allowedHandles: [],
    excludedHandles: [],
    enableImageUnderstanding: false,
    enableVideoUnderstanding: false,
    ...overrides,
  };
}

test("buildOpenRouterResponsesBody uses openrouter:web_search server tool", () => {
  const body = buildOpenRouterResponsesBody(
    "latest updates",
    createOptions({
      allowedDomains: ["arxiv.org", "github.com"],
    }),
    true,
  );

  assert.deepEqual(body, {
    model: "x-ai/grok-4-fast",
    input: "latest updates",
    tools: [
      {
        type: "openrouter:web_search",
        parameters: {
          allowed_domains: ["arxiv.org", "github.com"],
        },
      },
    ],
    stream: true,
  });
});

test("buildOpenRouterResponsesBody omits tool parameters when empty", () => {
  const body = buildOpenRouterResponsesBody(
    "latest updates",
    createOptions(),
    false,
  );

  assert.deepEqual(body, {
    model: "x-ai/grok-4-fast",
    input: "latest updates",
    tools: [{ type: "openrouter:web_search" }],
    stream: false,
  });
});

test("parseOpenRouterSseLine extracts output text deltas", () => {
  const event = parseOpenRouterSseLine(
    'data: {"type":"response.output_text.delta","delta":"hello"}',
  );

  assert.deepEqual(event, {
    type: "delta",
    text: "hello",
  });
});

test("parseOpenRouterSseLine extracts completed responses", () => {
  const event = parseOpenRouterSseLine(
    `data: ${JSON.stringify({
      type: "response.completed",
      response: {
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                annotations: [
                  {
                    type: "url_citation",
                    url: "https://example.com",
                    start_index: 0,
                    end_index: 7,
                  },
                ],
              },
            ],
          },
        ],
      },
    })}`,
  );

  assert.deepEqual(event, {
    type: "completed",
    response: {
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://example.com",
                  start_index: 0,
                  end_index: 7,
                },
              ],
            },
          ],
        },
      ],
    },
  });
});

test("parseOpenRouterSseLine handles non-data and done lines", () => {
  assert.deepEqual(parseOpenRouterSseLine("event: ping"), {
    type: "ignore",
  });
  assert.deepEqual(parseOpenRouterSseLine("data: [DONE]"), {
    type: "done",
  });
});
