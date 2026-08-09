import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

async function readRepositoryFile(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

const files = {
  requirements: "docs/context/ORIGINAL_REQUIREMENTS.md",
  businessLogic: "docs/BUSINESS_LOGIC.md",
  masterSpecification: "docs/MASTER-SPECIFICATION.md",
  progress: "docs/PROGRESS.md",
  systemContext: "docs/architecture/SYSTEM_CONTEXT.md",
  universalCatalogAdr: "docs/architecture/ADR-011-UNIVERSAL-CATALOG.md",
  universalCatalogPhysical: "docs/architecture/UNIVERSAL-CATALOG-B2-003.md",
  universalCatalogAudit: "docs/quality/B2-003-DESIGN-AUDIT.md",
};

const documents = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, relativePath]) => [
      key,
      await readRepositoryFile(relativePath),
    ]),
  ),
);

const requirementPrefix = "- **RQ-";
const requirementIds = documents.requirements
  .replaceAll("\r\n", "\n")
  .split("\n")
  .filter((line) => line.startsWith(requirementPrefix))
  .map((line) => Number(line.slice(requirementPrefix.length, requirementPrefix.length + 3)));

const expectedRequirementIds = Array.from({ length: 110 }, (_, index) => index + 1);
assert.deepEqual(
  requirementIds,
  expectedRequirementIds,
  "Requirements must be continuous from RQ-001 to RQ-110",
);

const requiredStatements = new Map([
  [
    "requirements",
    [
      "RQ-110",
      "cualquier mercancía u oferta permitida",
      "no debe exigir migración, cambio de código ni despliegue",
    ],
  ],
  [
    "businessLogic",
    [
      "RQ-110",
      "Núcleo agnóstico a categoría",
      "escalones son filas/datos",
      "cantidades 1–4 como fixture",
    ],
  ],
  [
    "masterSpecification",
    ["RQ-001–RQ-110", "categoría nueva sin migración/despliegue", "cantidad superior a cuatro"],
  ],
  ["progress", ["RQ-110 → ADR-011", "categoría nueva sin deploy", "cantidad >4"]],
  ["systemContext", ["categoría nueva es dato de la organización", "ADR-011"]],
  [
    "universalCatalogAdr",
    [
      "Estado: aceptada antes del modelo de datos B2",
      "Núcleo agnóstico a categoría",
      "Catálogo universal no significa publicación irrestricta",
      "no modifica migraciones, código ni artefactos desplegados",
    ],
  ],
  [
    "universalCatalogPhysical",
    [
      "PostgreSQL no interpreta lenguaje, fotos ni intención",
      "precios, monedas, tiers y `on_request`: B2-004",
      "stock, paquetes, kits, movimientos y reservas: B2-005",
      "buckets, objetos, variantes derivadas y URLs firmadas: B2-010",
      "forward-only y atómica",
    ],
  ],
  [
    "universalCatalogAudit",
    [
      "74/74 pgTAP",
      "runner pgTAP enlazado, probado y con guard de proyecto",
      "No se borró historial ni se deshabilitó una constraint",
      "este documento no usa `COMPLETE`",
    ],
  ],
]);

for (const [documentName, statements] of requiredStatements) {
  const document = documents[documentName];
  for (const statement of statements) {
    assert.ok(document.includes(statement), `${files[documentName]} must include: ${statement}`);
  }
}

const implementationContracts = [
  documents.businessLogic,
  documents.masterSpecification,
  documents.progress,
  documents.systemContext,
].join("\n");

const prohibitedFixedColumns = [
  "price_1",
  "price_2",
  "price_3",
  "price_4",
  "quantity_1",
  "quantity_2",
  "quantity_3",
  "quantity_4",
  "tire_size",
  "rim_size",
  "tank_capacity",
];

for (const prohibitedColumn of prohibitedFixedColumns) {
  assert.equal(
    implementationContracts.includes(prohibitedColumn),
    false,
    `Canonical implementation contracts must not require fixed category/quantity column: ${prohibitedColumn}`,
  );
}

console.log(
  `AgenteFer universal catalog documentation verified: ${requirementIds.length} continuous requirements and ${requiredStatements.size} canonical contracts.`,
);
