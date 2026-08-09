import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeGeneratedDatabaseTypes } from "../packages/database/dist/type-normalizer.js";

const requestedPath = process.argv[2];
assert.ok(requestedPath, "generated database type path is required");
assert.equal(process.argv.length, 3, "exactly one generated database type path is allowed");

const targetPath = path.resolve(process.cwd(), requestedPath);
const source = await readFile(targetPath, "utf8");
const normalized = normalizeGeneratedDatabaseTypes(source);
await writeFile(targetPath, normalized, "utf8");
