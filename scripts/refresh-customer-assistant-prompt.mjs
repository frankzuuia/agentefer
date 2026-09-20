// Refresh the catalog-owner guidance inside customer_assistant.system.
//
// Replaces three text fragments in app_private.prompt_versions.content_template
// for prompt_key='customer_assistant.system' and bumps the version to 5.
// Run after applying supabase/migrations/20260920104000_b3_006n_max_photos_default_public.sql
// to align the LLM prompt with the new add_photo RPC defaults (allowPublic=true,
// max 8 photos).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? "hprdctmblmfcoagugvyp";
const PROMPT_KEY = "customer_assistant.system";

const OLD_OWNER_SECTION = `## Edición de catálogo del dueño
Sólo cuando el turno sea de un miembro dueño y las herramientas estén autorizadas, puedes
modificar un artículo existente. Para "último producto" usa catalog_resolve_recent; para
un artículo concreto llama catalog_manage_context con variant_id y mira sus IDs reales de
precios y fotos. Si hay varios candidatos, pregunta cuál; nunca adivines el UUID.
catalog_edit_offer cambia una sola oferta por vez: set_status activa en la tienda QR sin
publicar en Facebook; edit_text cambia nombres o descripciones; set_price reemplaza la
presentación vigente o la deja a consultar; set_primary_photo y remove_photo usan
product_media_id exacto; add_photo usa mediaAssetId del catalog_ingestion_context de la
conversación actual. Para mostrar públicamente una foto, allowPublic exige permiso explícito
del dueño. Quitar foto desvincula, no borra el archivo. Publicar Facebook es un acto separado:
usa catalog_publish_offer tras orden explícita, con without_price=true sólo si el dueño lo pide.
Jamás lo infieras de "activar". Informa el resultado real de la herramienta, no prometas éxito
si hubo error. Las conversaciones de clientes no reciben estas herramientas.`;

const NEW_OWNER_SECTION = `## Edición de catálogo del dueño
Sólo cuando el turno sea de un miembro dueño y las herramientas estén autorizadas, puedes
modificar un artículo existente. Para "último producto" usa catalog_resolve_recent; para
un artículo concreto llama catalog_manage_context con variant_id y mira sus IDs reales de
precios y fotos. Ejecuta con el contexto disponible; pregunta solo si hay ambigüedad real
entre candidatos incompatibles, nunca por cortesía ni para confirmar lo que ya está claro.
Un producto puede tener hasta 8 fotos activas (combinando variante y producto).
catalog_edit_offer cambia una sola oferta por vez: set_status activa en la tienda QR sin
publicar en Facebook; edit_text cambia nombres o descripciones; set_price reemplaza la
presentación vigente o la deja a consultar; set_primary_photo y remove_photo usan
product_media_id exacto; add_photo usa mediaAssetId del catalog_ingestion_context de la
conversación actual o del admin panel (/admin/catalog) si el dueño la subió desde allí.
El RPC rechaza la novena foto con 23514 "product already has the maximum of 8 photos".
Las fotos agregadas son públicas por default (allowPublic=true); sólo son internas si el
dueño dice explícitamente "interna" o "no la muestres" (entonces pasa allowPublic=false).
No inventes categorías de visibilidad que no existen. Quitar foto desvincula; purgar la borra
de la DB y del storage cuando nadie más la referencia. Publicar Facebook es un acto separado:
usa catalog_publish_offer tras orden explícita, con without_price=true sólo si el dueño lo pide.
Jamás lo infieras de "activar". Si una foto agregada quedó con allowPublic=false y el dueño
quiere verla en Facebook, primero edita el product_media con allowPublic=true o agrégala
de nuevo. Informa el resultado real de la herramienta, no prometas éxito si hubo error.
Las conversaciones de clientes no reciben estas herramientas.`;

const OLD_ALLOW_PUBLIC = "allow_public requiere autorización del dueño para mostrar la foto; si no existe déjalo false.";

const NEW_ALLOW_PUBLIC = `Las fotos agregadas son públicas por default (allowPublic=true); sólo son internas si
el dueño dice explícitamente "interna" o "no la muestres". No inventes categorías de
visibilidad que no existen.`;

const OLD_TOOL_FAILURE = `Si una herramienta falla, no anuncies éxito: recupera estado, corrige el contrato o aclara el dato
faltante. Los clientes conservan el rol comercial y no reciben estas herramientas administrativas.`;

const NEW_TOOL_FAILURE = `Si una herramienta falla, no anuncies éxito: recupera estado, corrige el contrato o aclara el dato
faltante. Un producto puede tener hasta 8 fotos activas; el RPC rechaza la novena con 23514.
Los clientes conservan el rol comercial y no reciben estas herramientas administrativas.`;

const sql = `
with current as (
  select id, content_template::text as content, version_number
    from app_private.prompt_versions
   where prompt_key = '${PROMPT_KEY}'
   order by version_number desc
   limit 1
), replaced as (
  select id, version_number + 1 as new_version,
         replace(
           replace(
             replace(
               replace(content,
                 $OLD_OWNER$, $NEW_OWNER$
               ),
               $OLD_ALLOW$, $NEW_ALLOW$
             ),
             $OLD_TOOL$, $NEW_TOOL$
           )
         )::text as new_content
    from current
)
update app_private.prompt_versions pv
   set version_number = r.new_version,
       content_template = r.new_content,
       content_hash = encode(extensions.digest(r.new_content::text, 'sha256'), 'hex')
  from replaced r
 where pv.id = r.id
returning pv.id, pv.version_number;
`.replace("$OLD_OWNER$", "$$\n" + OLD_OWNER_SECTION + "\n$$")
 .replace("$NEW_OWNER$", "$$\n" + NEW_OWNER_SECTION + "\n$$")
 .replace("$OLD_ALLOW$", "$$\n" + OLD_ALLOW_PUBLIC + "\n$$")
 .replace("$NEW_ALLOW$", "$$\n" + NEW_ALLOW_PUBLIC + "\n$$")
 .replace("$OLD_TOOL$", "$$\n" + OLD_TOOL_FAILURE + "\n$$")
 .replace("$NEW_TOOL$", "$$\n" + NEW_TOOL_FAILURE + "\n$$");

const result = spawnSync(
  "npx",
  ["--yes", "supabase@2.111.0", "db", "query", "--linked", "--output-format", "json", "--command", sql],
  { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
);

process.stderr.write(`STATUS=${result.status}\nSTDOUT=${result.stdout?.slice(0, 1000)}\nSTDERR=${result.stderr?.slice(0, 1000)}\n`);
if (result.status !== 0) {
  process.exitCode = result.status;
} else {
  console.log("prompt refreshed");
}
