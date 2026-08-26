import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMessages } from "@cucumber/gherkin";
import { IdGenerator, SourceMediaType } from "@cucumber/messages";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const featureDirectory = path.join(repositoryRoot, "features");
const featureEntries = (await readdir(featureDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".feature"))
  .map((entry) => entry.name)
  .sort();

assert.ok(featureEntries.length > 0, "at least one executable Gherkin feature is required");

let totalPickles = 0;

for (const featureEntry of featureEntries) {
  const source = await readFile(path.join(featureDirectory, featureEntry), "utf8");
  const envelopes = generateMessages(
    source,
    featureEntry,
    SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
    {
      defaultDialect: "es",
      includeGherkinDocument: true,
      includePickles: true,
      includeSource: false,
      newId: IdGenerator.incrementing(),
    },
  );
  const parseErrors = envelopes.flatMap((envelope) =>
    envelope.parseError === undefined ? [] : [envelope.parseError],
  );

  assert.deepEqual(parseErrors, [], `${featureEntry} must parse without Gherkin syntax errors`);

  const document = envelopes.find((envelope) => envelope.gherkinDocument)?.gherkinDocument;
  const pickles = envelopes.flatMap((envelope) =>
    envelope.pickle === undefined ? [] : [envelope.pickle],
  );

  assert.ok(document?.feature, `${featureEntry} must define one feature`);
  assert.ok(pickles.length > 0, `${featureEntry} must compile at least one scenario`);
  assert.ok(
    pickles.every((pickle) => pickle.steps.length > 0),
    `${featureEntry} scenarios must contain executable steps`,
  );

  if (featureEntry === "b2_003_universal_catalog.feature") {
    const rules = document.feature.children.filter((child) => child.rule !== undefined);
    assert.ok(rules.length >= 5, "B2-003 must preserve its five catalog acceptance rules");
    assert.ok(pickles.length >= 7, "B2-003 must preserve all critical acceptance scenarios");
  }

  if (featureEntry === "b2_004_pricing.feature") {
    const rules = document.feature.children.filter((child) => child.rule !== undefined);
    assert.ok(rules.length >= 6, "B2-004 must preserve its six pricing acceptance rules");
    assert.ok(pickles.length >= 8, "B2-004 must preserve all critical pricing scenarios");
  }

  if (featureEntry === "b2_005_inventory.feature") {
    assert.ok(pickles.length >= 16, "B2-005 must preserve all critical inventory scenarios");
  }

  if (featureEntry === "b2_006_commercial_workflow.feature") {
    assert.ok(
      pickles.length >= 24,
      "B2-006 must preserve all critical pending, handoff, order and sale scenarios",
    );
  }

  if (featureEntry === "b2_007_publication_workflow.feature") {
    const rules = document.feature.children.filter((child) => child.rule !== undefined);
    assert.ok(rules.length >= 5, "B2-007 must preserve its five publication acceptance rules");
    assert.ok(
      pickles.length >= 30,
      "B2-007 must preserve all critical publication and failure scenarios",
    );
  }

  if (featureEntry === "b2_008_agent_runtime.feature") {
    const rules = document.feature.children.filter((child) => child.rule !== undefined);
    assert.ok(rules.length >= 6, "B2-008 must preserve its six agent runtime acceptance rules");
    assert.ok(
      pickles.length >= 50,
      "B2-008 must preserve all critical runtime, tool and recovery scenarios",
    );
  }

  if (featureEntry === "b4_003a_meta_whatsapp_inbound.feature") {
    assert.ok(
      pickles.length >= 16,
      "B4-003A must preserve all critical WhatsApp inbound, isolation and recovery scenarios",
    );
  }

  totalPickles += pickles.length;
}

console.log(
  `Acceptance contract verified: ${featureEntries.length} feature files, ${totalPickles} executable scenarios, zero parse errors.`,
);
