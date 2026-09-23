import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { splitSqlStatements } from "../packages/database/dist/linked-pgtap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "hprdctmblmfcoagugvyp";
const prerequisiteVersion = "20260922210000";
const migrationVersion = "20260923140000";
const migrationName = "b3_006w_owner_agent_catalog_integrity";
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "invoke through npm run deploy:database:b3-006w");
assert.ok(process.argv[2] === undefined || process.argv[2] === "--apply", "unknown operation");
assert.equal(
  (await readFile(path.join(root, "supabase/.temp/project-ref"), "utf8")).trim(),
  projectRef,
  "linked Supabase project must be AgenteFer",
);

const git = (args) =>
  spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 });
const branch = git(["branch", "--show-current"]);
const remote = git(["remote", "get-url", "origin"]);
assert.equal(branch.status, 0);
assert.equal(branch.stdout.trim(), "develop", "deployment must originate on develop");
assert.equal(remote.status, 0);
assert.equal(
  remote.stdout.trim(),
  "https://github.com/frankzuuia/agentefer.git",
  "deployment must originate from the AgenteFer repository",
);

const npx = path.join(path.dirname(npmExecutable), "npx-cli.js");
const supabase = (args) =>
  spawnSync(process.execPath, [npx, "--yes", "supabase@2.111.0", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
const history = supabase([
  "db",
  "query",
  "--linked",
  "--output-format",
  "json",
  "select version from supabase_migrations.schema_migrations order by version desc limit 1;",
]);
assert.equal(history.status, 0, "AgenteFer migration history read must succeed");
const latestVersion = JSON.parse(history.stdout).rows[0]?.version;
assert.equal(
  latestVersion,
  prerequisiteVersion,
  "linked database must still be at the reviewed B3-006V prerequisite",
);

const migration = await readFile(
  path.join(root, "supabase/migrations", `${migrationVersion}_${migrationName}.sql`),
  "utf8",
);
const statements = splitSqlStatements(migration);
assert.equal(statements[0]?.toLowerCase(), "begin");
assert.equal(statements.at(-1)?.toLowerCase(), "commit");
const digest = createHash("sha256").update(migration).digest("hex");

if (process.argv[2] !== "--apply") {
  process.stdout.write(
    `AgenteFer linked deployment preview: ${migrationVersion}, sha256 ${digest}, prerequisite ${latestVersion}; no changes applied.\n`,
  );
  process.exit(0);
}

const clean = git(["status", "--porcelain"]);
assert.equal(clean.status, 0);
assert.equal(clean.stdout.trim(), "", "commit all reviewed changes before deployment");
const head = git(["rev-parse", "HEAD"]);
const pushed = git(["rev-parse", "origin/develop"]);
assert.equal(head.status, 0);
assert.equal(pushed.status, 0);
assert.equal(head.stdout.trim(), pushed.stdout.trim(), "push develop before deployment");

const sql = `begin;
do $guard$ begin
  if (select max(version) from supabase_migrations.schema_migrations) <> '${prerequisiteVersion}' then
    raise exception using errcode = '55000', message = 'AgenteFer migration prerequisite changed';
  end if;
end $guard$;
${statements.slice(1, -1).join(";\n\n")};
insert into supabase_migrations.schema_migrations(version, name)
values ('${migrationVersion}', '${migrationName}');
commit;
`;
const directory = path.join(root, "tmp");
const file = path.join(directory, `b3-006w-linked-apply-${process.pid}.sql`);
await mkdir(directory, { recursive: true });
await writeFile(file, sql, "utf8");
let applied;
try {
  applied = supabase(["db", "query", "--linked", "--file", file, "--output-format", "json"]);
} finally {
  await rm(file, { force: true });
}
assert.equal(
  applied.status,
  0,
  `AgenteFer migration apply failed: ${applied.stdout}\n${applied.stderr}`,
);
const postflight = supabase([
  "db",
  "query",
  "--linked",
  "--output-format",
  "json",
  `select count(*)::integer as recorded from supabase_migrations.schema_migrations where version='${migrationVersion}';`,
]);
assert.equal(postflight.status, 0, "migration applied but postflight history read failed");
assert.equal(JSON.parse(postflight.stdout).rows[0]?.recorded, 1);
process.stdout.write(`Applied ${migrationVersion} atomically to AgenteFer; sha256 ${digest}.\n`);
