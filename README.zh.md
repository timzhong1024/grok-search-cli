# grok-search-cli

[English](./README.md)

[![awesome for agents](https://img.shields.io/badge/awesome-for_agents-ff6b35)](https://github.com/timzhong1024/grok-search-cli)
[![npm version](https://img.shields.io/npm/v/grok-search-cli)](https://www.npmjs.com/package/grok-search-cli)
[![npm downloads](https://img.shields.io/npm/dm/grok-search-cli)](https://www.npmjs.com/package/grok-search-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![node >= 22](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)

把 Grok 对 X 以及 GitHub、arXiv 等高价值公开数据源的访问能力，带到任何 agent 和 shell 工作流里。

这个 CLI 让这套能力可以直接用于 agent 工作流：在处理快速变化的话题时，更容易获得更新鲜的信息，同时显著降低自建和维护搜索能力的成本。

## 快速开始

先安装：

```bash
# 全局安装 CLI
pnpm add -g grok-search-cli
```

然后做一次健康检查：

```bash
# 检查当前配置是否可用
grok-search doctor
```

如果本地还没有配置文件，CLI 会自动创建：

```text
~/.config/grok-search-cli/config.json
```

打开这个文件，并按内置示例更新配置。默认的 xAI 官方配置如下：

```json
{
  "XAI_API_KEY": "your_xai_api_key",
  "XAI_MODEL": "grok-4-1-fast-non-reasoning",
  "XAI_BASE_URL": "",
  "XAI_COMPAT_MODE": false
}
```

然后执行查询：

```bash
# 先跑一个最基本的搜索
grok-search "latest xAI updates"
```

如果不想全局安装，也可以通过 `npx` 运行：

```bash
# 不全局安装，直接用 npx 运行
npx grok-search-cli doctor
npx grok-search-cli "latest xAI updates"
```

## 可以怎么搜

```bash
# 看看现在 X 上都在怎么讨论 xAI
grok-search "现在 X 上大家都在怎么讨论 xAI？"
```

```bash
# 验证一个刚出现的说法是不是真的
grok-search "有人说 xAI 今天开源了某个模型，这是真的吗？"
```

```bash
# 一次找论文和 GitHub 项目
grok-search "找最新的 browser-use agents 相关 arXiv 论文和 GitHub 项目"
```

```bash
# 把网页搜索限制在指定站点
grok-search "latest AI SDK updates" \
  --allowed-domains=ai-sdk.dev,vercel.com
```

```bash
# 按账号和日期限制 X 搜索范围
grok-search "latest xAI status on X" \
  --allowed-handles=xai,elonmusk \
  --from-date=2026-04-01
```

```bash
# 返回适合 agent 消费的 JSON
grok-search "latest xAI updates" --json
```

## 为什么用它

- 查“现在发生了什么”，而不是赌模型记忆有没有过时
- 一次调用同时看网页和 X
- 终端可直接读，agent 也能吃 JSON
- 可接 xAI、OpenRouter 和兼容代理站

## 给 Agent 用

这个仓库自带一个可安装 skill：

```bash
# 用 skills CLI 安装仓库自带的 skill
npx skills add timzhong1024/grok-search-cli --skill grok-search-cli
```

如果是 Codex，仓库里还带了一份可配套使用的 preset，见 [agents/codex.yaml](./agents/codex.yaml)。

可直接用这句触发：

```text
Spawn a grok-research researcher agent with gpt-5.4-mini and low reasoning, then use grok-search for high-freshness web+X research.
```

内置 skill 也可以直接打印到 `stdout` 后手动安装：

```bash
# 把内置 skill 打印出来并手动保存
grok-search skill > ~/.codex/skills/grok-search-cli/SKILL.md
```

## 配置方式

`process.env` 的优先级高于 `~/.config/grok-search-cli/config.json`，因此在临时覆盖配置时，优先使用 shell 环境变量。

### xAI 官方

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

### yunwu / 其他兼容代理站

```json
{
  "XAI_API_KEY": "your_proxy_api_key",
  "XAI_MODEL": "grok-4-fast",
  "XAI_BASE_URL": "https://yunwu.ai/v1",
  "XAI_COMPAT_MODE": true
}
```

## 服务选择建议

推荐顺序：

1. 优先使用 xAI 官方服务。这是 `web_search` 和 `x_search` 最直接、最稳定的路径。
2. OpenRouter 也比较稳。它对 xAI 模型可以走原生 xAI 支持的 web search。
3. 如果使用第三方代理站，需要自己确认搜索能力。很多代理站只暴露 `/chat/completions`，是否真的能搜索，取决于站点是否在内部为你开启了 web search。

## 搜索模式

### xAI 官方

直接连接 xAI 官方服务时使用。

- 同时支持 Web Search 和 X Search
- 支持网页域名过滤、X 账号过滤、日期过滤，以及图片或视频理解选项
- 这是能力最完整的模式

### OpenRouter

当 `XAI_BASE_URL` 指向 `openrouter.ai` 时使用。

- 支持通过 OpenRouter 的服务端搜索工具进行网页搜索
- 只支持网页域名过滤
- **不支持**配置 X 专属配置，例如账号、日期、以及图片或视频理解选项

### 其他兼容网关

当你通过其他 OpenAI-compatible 网关接入，并启用 `XAI_COMPAT_MODE=true` 时使用。

- 使用网关提供的兼容调用路径
- 是否真的搜索、怎么搜索，由中转站决定
- 不支持所有搜索高级配置

## CLI 参考

```bash
# 检查当前配置是否可用
grok-search doctor
```

```bash
# 把内置 skill 打印到 stdout
grok-search skill
```

```bash
# 查看完整命令帮助
grok-search --help
```

## 本地开发

本地如果要走 `.env`，`pnpm dev` 已经默认走 `dotenvx`：

```bash
# 开发时通过 dotenvx 运行 TypeScript 入口
pnpm install
pnpm dev "latest xAI updates" --verbose
```
