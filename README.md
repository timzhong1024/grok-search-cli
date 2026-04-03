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

Update the generated config file using one of the bundled examples. The default xAI official config is:

```json
{
  "XAI_API_KEY": "your_xai_api_key",
  "XAI_MODEL": "grok-4-1-fast-non-reasoning",
  "XAI_BASE_URL": "",
  "XAI_COMPAT_MODE": false
}
```

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

### xAI Official

```json
{
  "XAI_API_KEY": "your_xai_api_key",
  "XAI_MODEL": "grok-4-1-fast-non-reasoning",
  "XAI_BASE_URL": "",
  "XAI_COMPAT_MODE": false
}
```

### OpenRouter

```json
{
  "XAI_API_KEY": "your_openrouter_api_key",
  "XAI_MODEL": "x-ai/grok-4-fast:online",
  "XAI_BASE_URL": "https://openrouter.ai/api/v1",
  "XAI_COMPAT_MODE": false
}
```

### Yunwu / Other Compatible Gateways

```json
{
  "XAI_API_KEY": "your_proxy_api_key",
  "XAI_MODEL": "grok-4-fast",
  "XAI_BASE_URL": "https://yunwu.ai/v1",
  "XAI_COMPAT_MODE": true
}
```

## Provider Guide

Recommended order:

1. Use official xAI APIs when possible. This is the most direct and stable path for `web_search` and `x_search`.
2. OpenRouter is also a solid option. It can use native xAI-backed web search for xAI models.
3. If you use a third-party proxy, verify search support yourself. Many proxies only expose `/chat/completions`, and search only works if the proxy provider has enabled web search on their side.

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

Use this when you connect through another OpenAI-compatible gateway with `XAI_COMPAT_MODE=true`.

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
