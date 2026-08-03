import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));

const policy = await readJson("dependency-policy.json");
assert.equal(policy.schemaVersion, 1, "unsupported dependency policy schema");
assert.ok(policy.allowedRegistryHost, "dependency policy must name one registry host");

const manifestPaths = ["package.json"];
for (const workspaceRoot of ["apps", "packages"]) {
  const entries = await readdir(path.join(repositoryRoot, workspaceRoot), {
    withFileTypes: true,
  });

  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    manifestPaths.push(`${workspaceRoot}/${entry.name}/package.json`);
  }
}
manifestPaths.sort();

const manifests = await Promise.all(
  manifestPaths.map(async (manifestPath) => ({
    manifestPath,
    manifest: await readJson(manifestPath),
  })),
);
const workspaceNames = new Set(
  manifests
    .filter(({ manifestPath }) => manifestPath !== "package.json")
    .map(({ manifest }) => manifest.name),
);

const isNumeric = (value) =>
  value.length > 0 && [...value].every((character) => character >= "0" && character <= "9");

const isExactSemanticVersion = (version) => {
  const separatorIndex = version.indexOf("-");
  const core = separatorIndex === -1 ? version : version.slice(0, separatorIndex);
  const suffix = separatorIndex === -1 ? "" : version.slice(separatorIndex + 1);
  const coreParts = core.split(".");
  const suffixIsSafe = [...suffix].every(
    (character) =>
      (character >= "0" && character <= "9") ||
      (character >= "A" && character <= "Z") ||
      (character >= "a" && character <= "z") ||
      character === "." ||
      character === "-",
  );

  return (
    coreParts.length === 3 &&
    coreParts.every(isNumeric) &&
    (separatorIndex === -1 || (suffix.length > 0 && suffixIsSafe))
  );
};

let externalDirectDeclarations = 0;
for (const { manifestPath, manifest } of manifests) {
  if (manifestPath !== "package.json") {
    assert.equal(manifest.private, true, `${manifest.name} must remain private`);
    assert.equal(manifest.license, "UNLICENSED", `${manifest.name} must remain UNLICENSED`);
  }

  for (const section of dependencySections) {
    for (const [dependencyName, version] of Object.entries(manifest[section] ?? {})) {
      if (dependencyName.startsWith("@agentefer/")) {
        assert.ok(workspaceNames.has(dependencyName), `${dependencyName} is not a known workspace`);
        assert.equal(version, "*", `${dependencyName} must resolve only through npm workspaces`);
        continue;
      }

      assert.ok(
        isExactSemanticVersion(version),
        `${manifestPath} has a non-exact external dependency: ${dependencyName}@${version}`,
      );
      externalDirectDeclarations += 1;
    }
  }
}

const lockfile = await readJson("package-lock.json");
assert.equal(lockfile.lockfileVersion, 3, "package-lock.json must remain lockfileVersion 3");
const lockEntries = Object.entries(lockfile.packages);
const registryEntries = lockEntries.filter(([, entry]) => entry.resolved?.startsWith("https://"));
const allowedLicenses = new Set(policy.allowedExternalLicenseExpressions);

for (const [packagePath, entry] of registryEntries) {
  const resolvedUrl = new URL(entry.resolved);
  assert.equal(
    resolvedUrl.hostname,
    policy.allowedRegistryHost,
    `${packagePath} resolves from an unapproved registry host`,
  );
  assert.ok(entry.integrity, `${packagePath} is missing registry integrity`);
  assert.ok(entry.license, `${packagePath} is missing a declared license`);
  assert.ok(
    allowedLicenses.has(entry.license),
    `${packagePath} uses an unreviewed license expression: ${entry.license}`,
  );

  const nonLesserLicense = entry.license.replaceAll("LGPL-", "");
  assert.ok(
    !nonLesserLicense.includes("GPL-") && !nonLesserLicense.includes("AGPL-"),
    `${packagePath} introduces a prohibited GPL/AGPL license`,
  );
}

const packageNameFromLockPath = (packagePath) => {
  const segments = packagePath.split("/");
  const nodeModulesIndex = segments.lastIndexOf("node_modules");
  const firstNameSegment = segments[nodeModulesIndex + 1];
  assert.ok(firstNameSegment, `cannot derive package name from ${packagePath}`);

  if (!firstNameSegment.startsWith("@")) {
    return firstNameSegment;
  }

  const secondNameSegment = segments[nodeModulesIndex + 2];
  assert.ok(secondNameSegment, `cannot derive scoped package name from ${packagePath}`);
  return `${firstNameSegment}/${secondNameSegment}`;
};

const lifecyclePolicy = new Map(
  policy.allowedLifecyclePackages.map((entry) => [`${entry.name}@${entry.version}`, entry]),
);
const observedLifecycleKeys = new Set();

for (const [packagePath, entry] of lockEntries.filter(([, value]) => value.hasInstallScript)) {
  const dependencyName = packageNameFromLockPath(packagePath);
  const key = `${dependencyName}@${entry.version}`;
  const approval = lifecyclePolicy.get(key);
  assert.ok(approval, `${key} has an unreviewed lifecycle script`);
  assert.ok(approval.reason, `${key} lifecycle approval is missing a reason`);
  assert.equal(entry.dev, true, `${key} lifecycle script cannot enter production dependencies`);
  observedLifecycleKeys.add(key);
}

assert.deepEqual(
  [...observedLifecycleKeys].sort(),
  [...lifecyclePolicy.keys()].sort(),
  "lifecycle policy contains stale or missing package approvals",
);

const isReciprocalLicense = (license) => license.includes("LGPL-") || license.includes("MPL-");
const reciprocalRulesMatched = new Set();

for (const [packagePath, entry] of registryEntries.filter(([, value]) =>
  isReciprocalLicense(value.license),
)) {
  const dependencyName = packageNameFromLockPath(packagePath);
  const matchingRule = policy.allowedReciprocalPackageFamilies.find((rule) => {
    const nameMatches =
      rule.name === dependencyName ||
      (rule.prefix !== undefined && dependencyName.startsWith(rule.prefix));
    return nameMatches && rule.version === entry.version && rule.licenses.includes(entry.license);
  });

  assert.ok(
    matchingRule,
    `${dependencyName}@${entry.version} has unreviewed reciprocal license ${entry.license}`,
  );
  assert.ok(matchingRule.reason, `${dependencyName} reciprocal approval is missing a reason`);
  reciprocalRulesMatched.add(matchingRule.name ?? matchingRule.prefix);
}

assert.deepEqual(
  [...reciprocalRulesMatched].sort(),
  policy.allowedReciprocalPackageFamilies.map((entry) => entry.name ?? entry.prefix).sort(),
  "reciprocal-license policy contains a stale package family",
);

console.log(
  `Dependency policy verified: ${manifestPaths.length} manifests, ${externalDirectDeclarations} exact external declarations, ${registryEntries.length} registry artifacts.`,
);
console.log(
  `Reviewed exceptions: ${observedLifecycleKeys.size} lifecycle packages, ${reciprocalRulesMatched.size} reciprocal-license families.`,
);
