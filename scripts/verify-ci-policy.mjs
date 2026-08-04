import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const workflowDirectory = path.join(repositoryRoot, ".github", "workflows");

const isCommitSha = (value) => {
  if (value.length !== 40) {
    return false;
  }

  for (const character of value.toLowerCase()) {
    const isHexadecimal =
      (character >= "0" && character <= "9") || (character >= "a" && character <= "f");
    if (!isHexadecimal) {
      return false;
    }
  }

  return true;
};

const workflowEntries = (await readdir(workflowDirectory, { withFileTypes: true })).filter(
  (entry) => entry.isFile() && (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")),
);
assert.ok(workflowEntries.length > 0, "at least one GitHub Actions workflow is required");

for (const workflowEntry of workflowEntries) {
  const workflowPath = path.join(workflowDirectory, workflowEntry.name);
  const workflow = await readFile(workflowPath, "utf8");
  const workflowLines = workflow.split("\n");

  for (const line of workflowLines) {
    const normalizedLine = line.trim();
    assert.ok(
      !normalizedLine.endsWith(": write"),
      `${workflowEntry.name} requests write permission`,
    );

    if (!normalizedLine.startsWith("uses:")) {
      continue;
    }

    const actionReferenceWithComment = normalizedLine.slice("uses:".length).trim();
    const actionReference = actionReferenceWithComment.split(" ")[0];
    assert.ok(actionReference, `${workflowEntry.name} contains an empty action reference`);

    if (actionReference.startsWith("./")) {
      continue;
    }

    const separatorIndex = actionReference.lastIndexOf("@");
    assert.ok(separatorIndex > 0, `${actionReference} is missing a pinned ref`);
    const ref = actionReference.slice(separatorIndex + 1);
    assert.ok(isCommitSha(ref), `${actionReference} is not pinned to a full commit SHA`);
  }
}

const qualityWorkflow = await readFile(path.join(workflowDirectory, "quality.yml"), "utf8");
const pushStart = qualityWorkflow.indexOf("  push:\n");
const pullRequestStart = qualityWorkflow.indexOf("  pull_request:\n");
assert.ok(
  pushStart >= 0 && pullRequestStart > pushStart,
  "quality workflow triggers are malformed",
);

const pushConfiguration = qualityWorkflow.slice(pushStart, pullRequestStart);
assert.ok(pushConfiguration.includes("      - develop"), "quality push must target develop");
assert.ok(!pushConfiguration.includes("      - main"), "quality push cannot target main directly");
assert.ok(
  qualityWorkflow.includes("permissions:\n  contents: read"),
  "quality workflow must declare read-only contents permission",
);
assert.ok(
  qualityWorkflow.includes("persist-credentials: false"),
  "checkout credentials must not persist",
);
assert.ok(
  qualityWorkflow.includes("npm ci --ignore-scripts"),
  "CI must use exact scriptless install",
);
assert.ok(qualityWorkflow.includes("npm run verify"), "CI must run the complete quality gate");
assert.ok(qualityWorkflow.includes("npm audit signatures"), "CI must verify registry signatures");
assert.ok(
  qualityWorkflow.includes("database:\n    name: Database contract"),
  "CI must define the isolated database contract job",
);
assert.ok(
  qualityWorkflow.includes("supabase/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1"),
  "database CI must pin the audited Supabase CLI action",
);
assert.ok(
  qualityWorkflow.includes("version: 2.111.0"),
  "database CI must pin the verified Supabase CLI version",
);
for (const command of [
  "supabase db reset --local --no-seed",
  "supabase gen types typescript --local --schema app_private,api",
  "git diff --no-index --exit-code",
  "supabase test db --local supabase/tests",
  "supabase db lint --local --schema app_private,api --level warning --fail-on error",
  "supabase db advisors --local --type all --level warn --fail-on warn",
]) {
  assert.ok(qualityWorkflow.includes(command), `database CI must execute: ${command}`);
}

const dependabot = await readFile(path.join(repositoryRoot, ".github", "dependabot.yml"), "utf8");
const developTargets = dependabot.split("target-branch: develop").length - 1;
assert.equal(developTargets, 2, "both Dependabot ecosystems must target develop");
assert.ok(!dependabot.includes("target-branch: main"), "Dependabot cannot target main directly");

console.log(`CI policy verified: ${workflowEntries.length} workflow(s), all actions pinned.`);
