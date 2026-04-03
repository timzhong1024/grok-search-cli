# grok-search-cli

[中文说明](./README.zh.md)

Expose xAI Web + X search as a single CLI for agents that can run shell commands but do not integrate with xAI search APIs directly. It is built for prompts that need live web results, X discussion, and one-pass synthesis in the same call.

## Get Started

You only need two things to get it running: install the package, then provide the required environment variables.

```bash
pnpm add -g grok-search-cli
```

```env
XAI_API_KEY=your_xai_api_key
XAI_MODEL=grok-4-1-fast-non-reasoning
# XAI_BASE_URL=https://your-proxy.example.com/v1 # optional proxy base URL
# XAI_COMPAT_MODE=true # use OpenAI-compatible /chat/completions mode
```

Run it:

```bash
grok-search "latest xAI updates"
```

If you do not want a global install:

```bash
npx grok-search-cli "latest xAI updates"
```

Using OpenRouter:

```env
XAI_API_KEY=your_openrouter_api_key
XAI_BASE_URL=https://openrouter.ai/api/v1
XAI_MODEL=x-ai/grok-4-fast:online
```

With OpenRouter, the CLI auto-enables compatibility mode for the OpenAI-style endpoint and forwards OpenRouter web-search fields.

## Use With Agents

This repo ships with an installable skill:

```bash
npx skills add <owner>/<repo> --skill grok-search-cli
```

For Codex, use it as a research-agent preset: `gpt-5.4-mini` with `low` reasoning. See [skills/grok-search-cli/agents/codex.md](/Users/timzhong/grok-search-cli/skills/grok-search-cli/agents/codex.md).

Trigger it with:

```text
Spawn a grok-research researcher agent with gpt-5.4-mini and low reasoning, then use grok-search for high-freshness web+X research.
```

## Provider Recommendations

Recommended order:

1. Use official xAI APIs when possible. This is the most direct and stable path for `web_search` and `x_search`.
2. OpenRouter is also a solid option. Its web plugin can use native xAI search for xAI models, including both Web Search and X Search.
3. If you use a third-party proxy, verify search support yourself. Many proxies only expose `/chat/completions`, and search only works if the proxy provider has enabled web search on their side.

## Two Modes

### xAI Official Mode

Connect directly to xAI and use the Responses API with both tools enabled:

- `xai.tools.webSearch()`
- `xai.tools.xSearch()`

This is the full-featured mode.

### Proxy Mode

If your gateway only supports OpenAI-style `/chat/completions`, enable compatibility mode:

```env
XAI_BASE_URL=https://your-proxy.example.com/v1
XAI_COMPAT_MODE=true
```

In this mode the CLI switches to completion calls and does not explicitly register xAI tools.

If `XAI_BASE_URL` points to OpenRouter, the CLI uses OpenRouter Responses API web search and sends OpenRouter-specific search fields.

In compatibility mode:

- actual search behavior depends on the proxy
- tool-specific flags such as `--allowed-domains`, `--allowed-handles`, and `--from-date` are not forwarded; the CLI prints a warning if you pass them

## Common Commands

```bash
grok-search "What are people saying about xAI on X right now?"
```

```bash
grok-search "Somebody said xAI open-sourced model X today. Is that true?"
```

```bash
grok-search "Find the latest arXiv papers and GitHub repos about browser-use agents"
```

```bash
grok-search "latest AI SDK updates" \
  --allowed-domains=ai-sdk.dev,vercel.com
```

```bash
grok-search "latest xAI status on X" \
  --allowed-handles=xai,elonmusk \
  --from-date=2026-04-01
```

```bash
grok-search "latest xAI updates" --json
```

```bash
grok-search skill
```

The command prints the bundled skill to `stdout`, so it can also be redirected:

```bash
grok-search skill > ~/.codex/skills/grok-search-cli/SKILL.md
```

```bash
grok-search --help
```

## Local Development

For local `.env` workflows, `pnpm dev` already runs through `dotenvx`:

```bash
pnpm install
pnpm dev "latest xAI updates" --verbose
```
