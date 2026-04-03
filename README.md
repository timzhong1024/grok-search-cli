# grok-search-cli

[简体中文](./README.zh.md)

[![awesome for agents](https://img.shields.io/badge/awesome-for_agents-ff6b35)](https://github.com/timzhong1024/grok-search-cli)
[![npm version](https://img.shields.io/npm/v/grok-search-cli)](https://www.npmjs.com/package/grok-search-cli)
[![npm downloads](https://img.shields.io/npm/dm/grok-search-cli)](https://www.npmjs.com/package/grok-search-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![node >= 22](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)


Make Grok's access to X and high-value public sources such as GitHub and arXiv available in any agent or shell workflow.

This CLI makes that capability directly usable in agent workflows, with fresher information for fast-moving topics and far less operational overhead than building and maintaining a custom search stack.

## Quick Start

Install the package:

```bash
# Install the CLI globally
pnpm add -g grok-search-cli
```

Run a health check:

```bash
# Check whether your config is ready
grok-search doctor
```

If no config exists yet, the CLI creates:

```text
~/.config/grok-search-cli/config.json
```

In most cases, you only need to set an API key from [xAI](https://x.ai/api):

```json
{
  "XAI_API_KEY": "your_xai_api_key"
}
```

If you are using a non-official provider, see [Configuration](#configuration).

Run a query:

```bash
# Run a first search
grok-search "latest xAI updates"
```

If you do not want a global install, you can run it with `npx`:

```bash
# Run without a global install
npx grok-search-cli doctor
npx grok-search-cli "latest xAI updates"
```

## What You Can Ask

```bash
# Search current discussion on X
grok-search "What are people saying about xAI on X right now?"
```

```bash
# Verify a fresh rumor or claim
grok-search "Somebody said xAI open-sourced model X today. Is that true?"
```

```bash
# Search papers and repos together
grok-search "Find the latest arXiv papers and GitHub repos about browser-use agents"
```

```bash
# Constrain web results to specific domains
grok-search "latest AI SDK updates" \
  --allowed-domains=ai-sdk.dev,vercel.com
```

```bash
# Constrain X results by handle and date
grok-search "latest xAI status on X" \
  --allowed-handles=xai,elonmusk \
  --from-date=2026-04-01
```

```bash
# Return machine-readable JSON
grok-search "latest xAI updates" --json
```

## Why Use It

- Research what is happening now, not what the base model remembers
- Search the web and X in one call
- Return clean terminal output or JSON for agents
- Work with xAI, OpenRouter, or compatible gateways

## Use With Agents

This repo ships with an installable skill:

```bash
# Install the bundled skill with the skills CLI
npx skills add timzhong1024/grok-search-cli --skill grok-search-cli
```

For Codex, a matching preset is included at [agents/codex.yaml](./agents/codex.yaml).

Trigger it with:

```text
Spawn a grok-research researcher agent with gpt-5.4-mini and low reasoning, then use grok-search for high-freshness web+X research.
```

The bundled skill can also be printed to `stdout` and redirected:

```bash
# Print the bundled skill and save it manually
grok-search skill > ~/.codex/skills/grok-search-cli/SKILL.md
```

## Configuration

`process.env` takes priority over `~/.config/grok-search-cli/config.json`, so shell env is the easiest way to override config temporarily.

By default, the CLI uses the official xAI endpoint and the built-in default model `grok-4-1-fast-non-reasoning`.

| Field | Required | Default behavior | When you might override it |
| --- | --- | --- | --- |
| `XAI_API_KEY` | Yes | No default | Required in all cases |
| `XAI_MODEL` | No | Uses `grok-4-1-fast-non-reasoning` | When you want a different Grok model |
| `XAI_BASE_URL` | No | Uses the official xAI endpoint | When routing through OpenRouter or another compatible gateway |

If you want to override the model:

```json
{
  "XAI_API_KEY": "your_xai_api_key",
  "XAI_MODEL": "grok-4-1-fast-non-reasoning"
}
```

Important: model IDs are provider-specific. The official xAI model ID, the OpenRouter model ID, and the model ID expected by another compatible gateway may not match. If you switch providers, check the provider's expected model name instead of reusing the previous one unchanged.

### OpenRouter Example

```json
{
  "XAI_API_KEY": "your_openrouter_api_key",
  "XAI_MODEL": "x-ai/grok-4.1-fast",
  "XAI_BASE_URL": "https://openrouter.ai/api/v1"
}
```

### Other Compatible Gateway Example

```json
{
  "XAI_API_KEY": "your_proxy_api_key",
  "XAI_MODEL": "grok-4-fast",
  "XAI_BASE_URL": "https://yunwu.ai/v1",
  "XAI_COMPAT_MODE": true
}
```

For gateways such as yunwu, set `XAI_COMPAT_MODE=true`.

## Provider Guide

Recommended order:

1. Use official xAI APIs when possible. This is the most direct and stable path for `web_search` and `x_search`.
2. OpenRouter is the best fallback when you do not want to use xAI directly. It is the most predictable non-official option here.
3. Third-party compatible gateways such as yunwu are a compatibility fallback. Verify search support yourself. Many proxies only expose `/chat/completions`, and search only works if the proxy provider has enabled web search on their side.

Recommended model choices:

| Provider | Recommended model | Why |
| --- | --- | --- |
| xAI official | `grok-4-1-fast-non-reasoning` | Default path in this CLI, best support for `web_search` and `x_search` |
| OpenRouter | `x-ai/grok-4.1-fast` | Best default when routing through OpenRouter |
| Other compatible gateways such as yunwu | Provider-specific | Use the model ID your gateway actually exposes, for example `grok-4-fast` on yunwu |

## Search Modes

### xAI Official

Use this when you connect directly to xAI.

- Supports both web search and X search
- Supports web domain filters, X handle filters, date filters, and image or video understanding options
- Best choice when you want the full feature set

### OpenRouter

Use this when `XAI_BASE_URL` points to `openrouter.ai`.

- Supports web search through OpenRouter's server-side search tool
- Supports web domain filters
- Does not currently forward X-specific filters such as handles, dates, image, or video options

### Other Compatible Gateways

Use this when you connect through another OpenAI-compatible gateway.

- Uses the gateway's compatibility path
- Search behavior depends on the gateway
- Tool-specific filters are not forwarded, so advanced search controls may not be available

## CLI Reference

```bash
# Check whether your config is ready
grok-search doctor
```

```bash
# Print the bundled skill to stdout
grok-search skill
```

```bash
# Show all CLI options
grok-search --help
```

## Local Development

For local `.env` workflows, `pnpm dev` already runs through `dotenvx`:

```bash
# Run the TypeScript entrypoint through dotenvx in development
pnpm install
pnpm dev "latest xAI updates" --verbose
```
