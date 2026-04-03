import { getDefaultModel } from "./config";
import type { CliOptions, ParsedArgs } from "./types";

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function printHelp() {
  const defaultModel = getDefaultModel();
  process.stdout.write(`\
Usage:
  grok-search "<prompt>" [options]
  grok-search doctor
  grok-search skill

Options:
  doctor                          Show config and credential diagnostics
  skill                           Print the bundled skill to stdout
  --model=<id>                    Override model. Default: ${defaultModel}
  --timeout=<seconds>             Request timeout. Default: 60
  --json                          Output JSON
  --verbose                       Print request and token diagnostics
  --allowed-domains=a.com,b.com   Web Search allowed domains
  --excluded-domains=a.com,b.com  Web Search excluded domains
  --allowed-handles=xai,elonmusk  X Search allowed handles
  --excluded-handles=spam1,spam2  X Search excluded handles
  --from-date=YYYY-MM-DD          X Search start date
  --to-date=YYYY-MM-DD            X Search end date
  --image                         Enable image understanding
  --video                         Enable video understanding for X Search
  -h, --help                      Show this help

Environment:
  XAI_API_KEY                     Required
`);
}

function parseCsv(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function takeOptionValue(rawArg: string, args: string[], index: number) {
  const equalIndex = rawArg.indexOf("=");
  if (equalIndex >= 0) {
    return rawArg.slice(equalIndex + 1);
  }

  return args[index + 1];
}

function createDefaultOptions(): CliOptions {
  return {
    model: getDefaultModel(),
    timeoutMs: 60_000,
    json: false,
    verbose: false,
    allowedDomains: [],
    excludedDomains: [],
    allowedHandles: [],
    excludedHandles: [],
    enableImageUnderstanding: false,
    enableVideoUnderstanding: false,
  };
}

function setStringOption(
  rawArg: string,
  args: string[],
  index: number,
  label: string,
  assign: (value: string) => void,
) {
  const value = takeOptionValue(rawArg, args, index)?.trim();
  if (!value) {
    fail(`Missing value for ${label}`);
  }

  assign(value);
  return rawArg.includes("=") ? index : index + 1;
}

function setCsvOption(
  rawArg: string,
  args: string[],
  index: number,
  assign: (value: string[]) => void,
) {
  assign(parseCsv(takeOptionValue(rawArg, args, index)));
  return rawArg.includes("=") ? index : index + 1;
}

function setTimeoutOption(
  rawArg: string,
  args: string[],
  index: number,
  options: CliOptions,
) {
  const value = takeOptionValue(rawArg, args, index)?.trim();
  const timeoutSeconds = Number(value);
  if (!value || !Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    fail("Invalid value for --timeout. Use a number of seconds > 0.");
  }

  options.timeoutMs = Math.round(timeoutSeconds * 1000);
  return rawArg.includes("=") ? index : index + 1;
}

function parseSearchArgs(argv: string[]): ParsedArgs {
  const options = createDefaultOptions();
  const promptParts: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("-")) {
      promptParts.push(arg);
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (arg === "--image") {
      options.enableImageUnderstanding = true;
      continue;
    }

    if (arg === "--video") {
      options.enableVideoUnderstanding = true;
      continue;
    }

    if (arg.startsWith("--model")) {
      index = setStringOption(arg, argv, index, "--model", (value) => {
        options.model = value;
      });
      continue;
    }

    if (arg.startsWith("--timeout")) {
      index = setTimeoutOption(arg, argv, index, options);
      continue;
    }

    if (arg.startsWith("--allowed-domains")) {
      index = setCsvOption(arg, argv, index, (value) => {
        options.allowedDomains = value;
      });
      continue;
    }

    if (arg.startsWith("--excluded-domains")) {
      index = setCsvOption(arg, argv, index, (value) => {
        options.excludedDomains = value;
      });
      continue;
    }

    if (arg.startsWith("--allowed-handles")) {
      index = setCsvOption(arg, argv, index, (value) => {
        options.allowedHandles = value;
      });
      continue;
    }

    if (arg.startsWith("--excluded-handles")) {
      index = setCsvOption(arg, argv, index, (value) => {
        options.excludedHandles = value;
      });
      continue;
    }

    if (arg.startsWith("--from-date")) {
      index = setStringOption(arg, argv, index, "--from-date", (value) => {
        options.fromDate = value;
      });
      continue;
    }

    if (arg.startsWith("--to-date")) {
      index = setStringOption(arg, argv, index, "--to-date", (value) => {
        options.toDate = value;
      });
      continue;
    }

    fail(`Unknown option: ${arg}`);
  }

  const prompt = promptParts.join(" ").trim();
  if (!prompt) {
    fail("Missing prompt.");
  }

  if (options.allowedDomains.length > 0 && options.excludedDomains.length > 0) {
    fail("Use either --allowed-domains or --excluded-domains, not both.");
  }

  if (options.allowedHandles.length > 0 && options.excludedHandles.length > 0) {
    fail("Use either --allowed-handles or --excluded-handles, not both.");
  }

  return {
    command: "all",
    prompt,
    options,
  };
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (argv[0] === "skill") {
    const unknownOptions = argv.filter(
      (arg, index) =>
        index > 0 &&
        arg.startsWith("-") &&
        arg !== "--help" &&
        arg !== "-h",
    );

    if (unknownOptions.length > 0) {
      fail(`Unknown option: ${unknownOptions[0]}`);
    }

    return { command: "skill" };
  }

  if (argv[0] === "doctor") {
    const unknownOptions = argv.filter(
      (arg, index) =>
        index > 0 &&
        arg.startsWith("-") &&
        arg !== "--help" &&
        arg !== "-h",
    );

    if (unknownOptions.length > 0) {
      fail(`Unknown option: ${unknownOptions[0]}`);
    }

    return { command: "doctor" };
  }

  return parseSearchArgs(argv);
}

export { fail };
