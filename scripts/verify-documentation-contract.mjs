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
  commercialResearch: "docs/references/COMMERCIAL-B2-006-RESEARCH.md",
  commercialPhysical: "docs/architecture/COMMERCIAL-WORKFLOW-B2-006.md",
  commercialAudit: "docs/quality/B2-006-DESIGN-AUDIT.md",
  publicationResearch: "docs/references/PUBLICATIONS-B2-007-RESEARCH.md",
  publicationPhysical: "docs/architecture/PUBLICATION-WORKFLOW-B2-007.md",
  publicationAudit: "docs/quality/B2-007-DESIGN-AUDIT.md",
  metaVaultPhysical: "docs/architecture/META-VAULT-CREDENTIALS-B4-001.md",
  metaVaultAudit: "docs/quality/B4-001-META-VAULT-DESIGN-AUDIT.md",
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
      "run `31407961615`",
      "B2-003–B2-009 completos y certificados",
      "run `31551318493`",
      "CI final `31608356030`",
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
      "COMPLETE — INTEGRITY TOTAL — MATCH PERFECT",
      "110/110",
      "385/385 pgTAP",
      "9542D6C8878A4115B455A01E66D4D6E13D3AB9895CB3097F1B43B3F15CE4D605",
      "31543232608",
      "93950086145",
      "93950556743",
      "93950556798",
      "14/14",
      "No se deshabilitó ninguna constraint",
    ],
  ],
  [
    "commercialResearch",
    [
      "RLS es defensa en profundidad",
      "FKs compuestas preservan organización",
      "SELECT ... FOR UPDATE",
      "venta no contiene estado de pago",
    ],
  ],
  [
    "commercialPhysical",
    [
      "pedido no equivale a venta",
      "venta no equivale a pago",
      "RLS habilitado y forzado en las 14 tablas",
      "misma clave con otro contrato falla",
      "api.reconcile_sale_inventory",
      "no puede reescribir producto, precio, cantidad ni historia",
      "tool calling nativo",
    ],
  ],
  [
    "commercialAudit",
    [
      "Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`)",
      "ventas concurrentes no sobrecumplen una línea",
      "PII y datos cross-tenant no se exponen",
      "COMPLETE — INTEGRITY TOTAL — MATCH PERFECT",
      "482/482 pgTAP",
      "22/22 mutantes eliminados",
      "31551318493",
      "93974764573",
      "No se deshabilitó ninguna constraint",
    ],
  ],
  [
    "publicationResearch",
    [
      "Página de Facebook y Marketplace son superficies diferentes",
      "social_capabilities",
      "no se publica otra vez a ciegas",
      "`pgmq` y `pg_cron`",
    ],
  ],
  [
    "publicationPhysical",
    [
      "No existen columnas o ramas para llantas",
      "external_effect_key",
      "FOR UPDATE SKIP LOCKED",
      "catalog_snapshot_stale",
      "price_snapshot_stale",
      "stock_unavailable",
      "tool calling nativo",
    ],
  ],
  [
    "publicationAudit",
    [
      "Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`)",
      "Estado: **COMPLETE — INTEGRITY TOTAL — MATCH PERFECT**",
      "83/83 pgTAP",
      "36 escenarios B2-007",
      "32/32",
      "run `31608356030`",
      "job `94150746066`",
      "nueve referencias sin índice",
      "Meta sigue sin credenciales/capacidades reales",
      "No se deshabilitó ninguna constraint",
    ],
  ],
  [
    "metaVaultPhysical",
    [
      "AgenteFer no guardará App Secrets",
      "WABA, número o cuenta hardcodeados",
      "`service_role` es un rol privilegiado administrado por Supabase",
      "sólo expone `api`",
      "`graphql_public`; `vault`, `app_private` y `public` quedan fuera",
      "nunca proyecta `vault_secret_id` al Data API",
      "SHA-256 sobre el `bytea` crudo",
      "sin editar código, variables de EasyPanel ni redesplegar",
      "la App de prueba ni la de Fer",
    ],
  ],
  [
    "metaVaultAudit",
    [
      "VAULT INFRASTRUCTURE CERTIFIED — META CAPABILITY MATRIX PENDING",
      "15/15 migraciones",
      "782/782 pgTAP",
      "51/51 pgTAP",
      "82/82 pgTAP",
      "11/11 mutantes críticos eliminados",
      "Data API",
      "drift=false",
      "cero secretos QA residuales",
      "intentos fallidos se persistió",
      "permanece abierta",
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
  `AgenteFer catalog, pricing, inventory, commercial and publication documentation verified: ${requirementIds.length} continuous requirements and ${requiredStatements.size} canonical contracts.`,
);
