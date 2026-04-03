import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_NAME = "grok-search-cli";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

function resolveSkillFile(...segments: string[]) {
  const candidatePaths = [
    path.resolve(currentDir, "..", "skills", SKILL_NAME, ...segments),
    path.resolve(currentDir, "..", "..", "skills", SKILL_NAME, ...segments),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return readFileSync(candidatePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(
    `Bundled skill file not found for ${SKILL_NAME}: ${segments.join("/")}`,
  );
}

export function readSkillMarkdown() {
  return resolveSkillFile("SKILL.md");
}
