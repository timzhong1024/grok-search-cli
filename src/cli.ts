import { parseArgs, fail } from "./args";
import {
  ensureUserConfigFile,
  getApiMode,
  getBaseUrl,
  getConfigDoctorSnapshot,
  getProviderKind,
  printGatewayError,
} from "./config";
import { printPretty, streamPretty } from "./output";
import {
  createDefaultSearchOptions,
  createLocalExecutionContext,
  createPayload,
  ensureLocalApiKey,
  getWarnings,
  runSearchRequest,
  runStreamRequest,
} from "./search";
import { readSkillMarkdown } from "./skill";

function printDoctor() {
  const snapshot = getConfigDoctorSnapshot();

  process.stdout.write("Doctor:\n");
  process.stdout.write(`Config path: ${snapshot.configPath}\n`);
  process.stdout.write(
    `API key: ${snapshot.apiKeyPresent ? "present" : "missing"} (${snapshot.sources.apiKey})\n`,
  );
  process.stdout.write(`Model: ${snapshot.model} (${snapshot.sources.model})\n`);
  process.stdout.write(
    `Base URL: ${snapshot.baseUrl ?? "(xAI default)"} (${snapshot.sources.baseUrl})\n`,
  );
  process.stdout.write(
    `Compat mode source: ${snapshot.sources.compatMode}\n`,
  );
  process.stdout.write(`Provider: ${snapshot.providerKind}\n`);
  process.stdout.write(`API mode: ${snapshot.apiMode}\n`);
  process.stdout.write(
    `Status: ${snapshot.apiKeyPresent ? "OK" : "NOT READY"}\n`,
  );

  if (!snapshot.apiKeyPresent) {
    const configPath = ensureUserConfigFile();
    process.stdout.write(`Action: edit ${configPath}\n`);
  }
}

function ensureApiKey() {
  try {
    return ensureLocalApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
  }
}

function shouldStreamPrettyOutput(json: boolean) {
  return process.stdout.isTTY && !json;
}

async function runStream(params: ReturnType<typeof createLocalExecutionContext>) {
  const stream = await runStreamRequest(params);
  await streamPretty({
    stream,
    payload: {
      command: "all",
      apiMode: params.apiMode,
      model: params.options.model,
      prompt: params.prompt,
    },
    includeVerbose: params.options.verbose,
    requestApi: params.requestApi,
    baseUrl: params.runtimeConfig.baseUrl,
    startedAt: params.startedAt,
  });
}

async function runOnce(
  params: ReturnType<typeof createLocalExecutionContext>,
  json: boolean,
) {
  const result = await runSearchRequest(params);
  const payload = createPayload({
    command: "all",
    apiMode: params.apiMode,
    model: params.options.model,
    prompt: params.prompt,
    result,
    verbose: params.options.verbose,
    requestApi: params.requestApi,
    baseUrl: params.runtimeConfig.baseUrl,
    startedAt: params.startedAt,
  });

  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  printPretty(payload);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "skill") {
    process.stdout.write(`${readSkillMarkdown()}\n`);
    return;
  }

  if (parsed.command === "doctor") {
    printDoctor();
    return;
  }

  ensureApiKey();

  const options = {
    ...createDefaultSearchOptions(),
    model: parsed.options.model,
    timeoutMs: parsed.options.timeoutMs,
    verbose: parsed.options.verbose,
    allowedDomains: parsed.options.allowedDomains,
    excludedDomains: parsed.options.excludedDomains,
    allowedHandles: parsed.options.allowedHandles,
    excludedHandles: parsed.options.excludedHandles,
    fromDate: parsed.options.fromDate,
    toDate: parsed.options.toDate,
    enableImageUnderstanding: parsed.options.enableImageUnderstanding,
    enableVideoUnderstanding: parsed.options.enableVideoUnderstanding,
  };
  const runParams = createLocalExecutionContext(parsed.prompt, options);

  for (const warning of getWarnings(
    runParams.apiMode,
    runParams.runtimeConfig.baseUrl,
    runParams.options,
  )) {
    console.error(warning);
  }

  if (shouldStreamPrettyOutput(parsed.options.json)) {
    await runStream(runParams);
    return;
  }

  await runOnce(runParams, parsed.options.json);
}

void main().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  printGatewayError(getProviderKind(getBaseUrl()), getApiMode());
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
