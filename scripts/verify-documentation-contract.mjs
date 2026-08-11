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
  pricingResearch: "docs/references/PRICING-B2-004-RESEARCH.md",
  pricingPhysical: "docs/architecture/PRICING-B2-004.md",
  pricingAudit: "docs/quality/B2-004-DESIGN-AUDIT.md",
  inventoryResearch: "docs/references/INVENTORY-B2-005-RESEARCH.md",
  inventoryPhysical: "docs/architecture/INVENTORY-B2-005.md",
  inventoryAudit: "docs/quality/B2-005-DESIGN-AUDIT.md",
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
  [
    "progress",
    [
      "RQ-110 → ADR-011",
      "categoría nueva sin deploy",
      "cantidad >4",
      "B2-003/B2-004 completos",
      "run `31407961615`",
    ],
  ],
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
      "75/75 pgTAP",
      "runner pgTAP enlazado, probado y con guard de proyecto",
      "No se borró historial ni se deshabilitó una constraint",
      "Estado: **COMPLETE**, **INTEGRITY TOTAL** y **MATCH PERFECT**",
      "run `31325637856`",
    ],
  ],
  [
    "pricingResearch",
    [
      "`numeric`/`decimal` como tipos exactos",
      "`EXCLUDE` para restricciones entre filas",
      "`btree_gist` combina igualdad escalar con rangos",
      "impiden cantidades arbitrarias",
    ],
  ],
  [
    "pricingPhysical",
    [
      "B2-004 no decide qué quiso decir Fer",
      "libro, variante, unidad, cantidad y vigencia",
      "`fixed_total`",
      "`per_unit`",
      "forward-only y atómica",
    ],
  ],
  [
    "pricingAudit",
    [
      "Estado: **COMPLETE — INTEGRITY TOTAL — MATCH PERFECT**",
      "66/66 pgTAP",
      "275/275 pgTAP",
      "hprdctmblmfcoagugvyp",
      "price_tiers_no_current_overlap",
      "timestamp en regresión acumulada",
      "7/7 mutantes de esquema",
      "run `31407961615`",
      "No se deshabilitó ninguna constraint",
    ],
  ],
  [
    "inventoryResearch",
    [
      "RLS forzado y privilegio mínimo",
      "bloqueos de saldos en orden estable",
      "No se creó una tabla o columna por llantas",
      "inventory_commands",
    ],
  ],
  [
    "inventoryPhysical",
    [
      "El inventario es un ledger multi-tenant",
      "stock cero no equivale a pausa manual",
      "misma clave + misma huella = replay",
      "B3-008 expondrá las tools cognitivas",
    ],
  ],
  [
    "inventoryAudit",
    [
      "IMPLEMENTED — REMOTE VERIFIED — CI SQL GATES PENDING",
      "110/110",
      "385/385 pgTAP",
      "9542D6C8878A4115B455A01E66D4D6E13D3AB9895CB3097F1B43B3F15CE4D605",
      "14/14",
      "No se deshabilitó ninguna constraint",
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
  `AgenteFer catalog, pricing and inventory documentation verified: ${requirementIds.length} continuous requirements and ${requiredStatements.size} canonical contracts.`,
);
