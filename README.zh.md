# grok-search-cli

[English](./README.md)

把 xAI 的 Web + X 联合搜索能力暴露成一个通用 CLI，给只能调用命令行的 agent 用。适合那种既要看实时网页结果、又要看 X 讨论、还希望模型顺手做一轮综合判断的 prompt。

## 跑起来

最小依赖只有两件事：装包，然后提供所需环境变量。

```bash
pnpm add -g grok-search-cli
```

```env
XAI_API_KEY=your_xai_api_key
XAI_MODEL=grok-4-1-fast-non-reasoning
# XAI_BASE_URL=https://your-proxy.example.com/v1 # optional proxy base URL
# XAI_COMPAT_MODE=true # use OpenAI-compatible /chat/completions mode
```

直接跑：

```bash
grok-search "latest xAI updates"
```

如果不想全局安装：

```bash
npx grok-search-cli "latest xAI updates"
```

如果走 OpenRouter，可以直接这样配：

```env
XAI_API_KEY=your_openrouter_api_key
XAI_BASE_URL=https://openrouter.ai/api/v1
XAI_MODEL=x-ai/grok-4-fast:online
```

走 OpenRouter 时，CLI 会针对它的 OpenAI 风格接口自动开启兼容模式，并转发 OpenRouter 的 web search 字段。

## 给 Agent 用

这个仓库自带一个可安装 skill：

```bash
npx skills add <owner>/<repo> --skill grok-search-cli
```

如果是 Codex，推荐把它当成一个 research agent 约定来用：默认 `gpt-5.4-mini` + `low` reasoning，见 [agents/codex.yaml](./agents/codex.yaml)。

可直接用这句触发：

```text
Spawn a grok-research researcher agent with gpt-5.4-mini and low reasoning, then use grok-search for high-freshness web+X research.
```

## 服务推荐

推荐顺序：

1. 优先使用 xAI 官方服务。这是 `web_search` 和 `x_search` 最直接、最稳定的路径。
2. OpenRouter 也比较稳。它的 web 插件对 xAI 模型可以走原生 xAI 搜索，包含 Web Search 和 X Search。
3. 如果使用第三方代理站，需要自己确认搜索能力。很多代理站只暴露 `/chat/completions`，是否真的能搜索，取决于站点是否在内部为你开启了 web search。

## 两种模式

### xAI 官方模式

直接连 xAI 官方 API，使用 Responses API，并同时注册：

- `xai.tools.webSearch()`
- `xai.tools.xSearch()`

这是能力最完整的模式。

### 中转站模式

如果你的 API 中转站只支持 OpenAI 风格的 `/chat/completions`，就打开兼容模式：

```env
XAI_BASE_URL=https://your-proxy.example.com/v1
XAI_COMPAT_MODE=true
```

这时 CLI 会改走 completion 调用，不再显式注册 xAI tools。

如果 `XAI_BASE_URL` 指向 OpenRouter，CLI 会走 OpenRouter 的 Responses API，并按 OpenRouter 的 web search 请求字段发送参数。

兼容模式下：

- 是否真的搜索、怎么搜索，由中转站决定
- `--allowed-domains`、`--allowed-handles`、`--from-date` 这类 tool 参数不会下传；如果传了，CLI 会打印 warning

## 常用命令

```bash
grok-search "现在 X 上大家都在怎么讨论 xAI？"
```

```bash
grok-search "有人说 xAI 今天开源了某个模型，这是真的吗？"
```

```bash
grok-search "找最新的 browser-use agents 相关 arXiv 论文和 GitHub 项目"
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

这个命令会把内置 skill 直接打印到 `stdout`，所以也可以重定向保存：

```bash
grok-search skill > ~/.codex/skills/grok-search-cli/SKILL.md
```

```bash
grok-search --help
```

## 本地开发

本地如果要走 `.env`，`pnpm dev` 已经默认走 `dotenvx`：

```bash
pnpm install
pnpm dev "latest xAI updates" --verbose
```
