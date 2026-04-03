---
name: grok-search-cli
description: Use for high-freshness web+X research through a CLI, with Grok-backed synthesis plus JSON/citations output for agent workflows.
---

# grok-search-cli

Use this skill when you need high-freshness search from a shell command and the runtime can invoke a CLI but does not natively integrate with xAI search tools.

## Why Use It

This CLI is useful because Grok search is strong on freshness.

In xAI official mode, the CLI does not just call a plain search API and dump links back. It hands the research step to a Grok model with server-side search tools. In practice, that is close to letting a search-focused subagent go online, collect current results, and do one round of filtering and synthesis before the answer comes back.

That makes this tool a good fit when you want current information with a lower hallucination risk than answering from stale memory.

Especially consider this tool when searching:

- X discussions and real-time public sentiment
- GitHub repositories, release chatter, issue discussions, and ecosystem updates
- papers, research announcements, and technical writeups
- any current technical question where freshness matters more than raw recall

## What It Does

This skill exposes one CLI entrypoint for:

- combined web + X search
- JSON output for downstream agent processing

## Choose the Right Mode

### xAI official mode

Use this when direct xAI access is available.

Required environment:

```bash
export XAI_API_KEY=...
```

Optional:

```bash
export XAI_MODEL=grok-4-1-fast-non-reasoning
```

In this mode the CLI uses xAI Responses API server-side tools:

- `xai.tools.webSearch()`
- `xai.tools.xSearch()`

### Proxy mode

Use this when the endpoint only supports OpenAI-style `/chat/completions`.

Required environment:

```bash
export XAI_API_KEY=...
export XAI_BASE_URL=https://your-proxy.example.com/v1
export XAI_COMPAT_MODE=true
```

Optional:

```bash
export XAI_MODEL=grok-4-1-fast-non-reasoning
```

In this mode the CLI falls back to completion calls. Tool-specific filters are not forwarded because search behavior depends on the proxy.

## When To Reach For It

Prefer this CLI over answering from memory when:

- the user asks for the latest, current, recent, or today
- the answer depends on X, GitHub, papers, release notes, or public web reporting
- you want the model to search first and synthesize second
- you want a smaller chance of hallucinating versions, timelines, or public discussion

It is still a search-and-synthesis tool, not a perfect source of truth. For important claims, inspect the returned sources.

## Command Patterns

Default mode is combined web + X search:

```bash
grok-search "latest xAI updates"
```

Machine-readable output:

```bash
grok-search "latest xAI updates" --json
```

Useful filters in xAI official mode:

```bash
grok-search "latest AI SDK updates" --allowed-domains=ai-sdk.dev,vercel.com
grok-search "latest xAI status" --allowed-handles=xai,elonmusk --from-date=2026-04-01
```

## When to Prefer This Skill

- The agent can run shell commands but cannot call xAI APIs directly
- You want one stable CLI for combined web and X research
- You want citations or sources in stdout / JSON
- You need a fallback path for OpenAI-compatible proxy endpoints
- You want Grok to do one search/synthesis pass before the answer reaches the main agent

## Notes

- `--json` is the safest mode for agent consumption
- In proxy mode, search is proxy-defined and tool-specific flags are ignored with a warning
