export const ADMIN_CATALOG_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#101828">
  <title>Catálogo de Fer</title>
  <link rel="icon" href="/admin/catalog/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/admin/catalog/app.css">
  <script src="/admin/catalog/app.js" defer></script>
</head>
<body>
  <main id="auth-view" class="auth-shell">
    <section class="auth-card" aria-labelledby="auth-title">
      <div class="brand-mark" aria-hidden="true">F</div>
      <p class="eyebrow">Administración segura</p>
      <h1 id="auth-title">Catálogo de Fer</h1>
      <p class="auth-copy">Inicia sesión con tu cuenta autorizada. La sesión permanece solo en esta pestaña.</p>
      <form id="login-form" novalidate>
        <label for="email">Correo</label>
        <input id="email" name="email" type="email" inputmode="email" autocomplete="username" required maxlength="320">
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="4096">
        <button id="login-button" class="button primary wide" type="submit">Entrar</button>
      </form>
      <p id="login-message" class="message" role="status" aria-live="polite"></p>
    </section>
  </main>

  <div id="app-view" class="app-shell" hidden>
    <header class="app-header">
      <div>
        <p class="eyebrow">Tienda QR</p>
        <h1>Catálogo de Fer</h1>
      </div>
      <button id="logout-button" class="icon-button" type="button" aria-label="Cerrar sesión">Salir</button>
    </header>

    <div class="desktop-layout">
      <aside class="desktop-nav" aria-label="Navegación principal">
        <button class="nav-button active" type="button" data-section-button="catalog">Catálogo</button>
        <button class="nav-button" type="button" data-section-button="publications">Publicaciones</button>
        <button class="nav-button" type="button" data-section-button="summary">Resumen</button>
      </aside>

      <div class="content-shell">
        <section class="context-bar" aria-label="Contexto del catálogo">
          <label class="select-field" for="organization-select">
            <span>Negocio</span>
            <select id="organization-select"></select>
          </label>
          <div class="select-field facebook-field">
            <span id="facebook-field-label">Página de Facebook</span>
            <div class="facebook-control">
              <svg class="facebook-logo" viewBox="0 0 24 24" role="img" aria-label="Facebook">
                <path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.489h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.974h-1.513c-1.49 0-1.956.931-1.956 1.887v2.26h3.328l-.532 3.489h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              <span id="facebook-empty-text" class="facebook-empty-text">Sin página conectada</span>
              <select id="connection-select" aria-labelledby="facebook-field-label" hidden></select>
              <button id="connect-facebook-button" class="facebook-connect-button" type="button">
                <span id="connect-facebook-label">Conectar Facebook</span>
              </button>
            </div>
          </div>
        </section>

        <section id="catalog-section" class="section-panel active" data-section="catalog" aria-labelledby="catalog-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Productos</p>
              <h2 id="catalog-title">Catálogo</h2>
            </div>
            <button id="publish-all-button" class="button primary compact" type="button" disabled>Publicar pendientes</button>
          </div>

          <div id="stats-strip" class="stats-strip" aria-label="Resumen del catálogo"></div>

          <form id="filters-form" class="filters" role="search">
            <label class="search-field" for="catalog-search">
              <span class="sr-only">Buscar producto o SKU</span>
              <input id="catalog-search" type="search" placeholder="Buscar producto o SKU" maxlength="160" autocomplete="off">
            </label>
            <label class="filter-field" for="status-filter">
              <span class="sr-only">Filtrar por estado</span>
              <select id="status-filter">
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="paused">Pausados</option>
                <option value="draft">Borradores</option>
                <option value="archived">Archivados</option>
              </select>
            </label>
            <button class="button secondary compact" type="submit">Buscar</button>
          </form>

          <div id="catalog-message" class="message inline" role="status" aria-live="polite"></div>
          <div id="catalog-list" class="catalog-list" aria-busy="false"></div>
          <div id="empty-catalog" class="empty-state" hidden>
            <div class="empty-icon" aria-hidden="true">□</div>
            <h3>No hay productos en esta página</h3>
            <p>Ajusta el filtro o carga el catálogo desde el agente de WhatsApp.</p>
          </div>
          <nav class="pager" aria-label="Páginas del catálogo">
            <button id="previous-page" class="button secondary" type="button" disabled>Anterior</button>
            <span id="page-label">Página 1</span>
            <button id="next-page" class="button secondary" type="button" disabled>Siguiente</button>
          </nav>
        </section>

        <section id="publications-section" class="section-panel" data-section="publications" aria-labelledby="publications-title" hidden>
          <div class="section-heading">
            <div>
              <p class="eyebrow">Facebook</p>
              <h2 id="publications-title">Publicaciones</h2>
            </div>
            <button id="refresh-publications" class="button secondary compact" type="button">Actualizar</button>
          </div>
          <p class="section-copy">Los lotes continúan en segundo plano aunque sigas usando el agente. Aquí aparecen hasta los seis más recientes.</p>
          <div id="batch-list" class="batch-list"></div>
          <div id="empty-batches" class="empty-state" hidden>
            <div class="empty-icon" aria-hidden="true">✓</div>
            <h3>Aún no hay lotes</h3>
            <p>Usa “Publicar pendientes” cuando la página de Facebook esté conectada.</p>
          </div>
        </section>

        <section id="summary-section" class="section-panel" data-section="summary" aria-labelledby="summary-title" hidden>
          <div class="section-heading">
            <div>
              <p class="eyebrow">Estado general</p>
              <h2 id="summary-title">Resumen</h2>
            </div>
          </div>
          <div id="summary-grid" class="summary-grid"></div>
          <article class="info-card">
            <h3>Flujo seguro</h3>
            <p>Las fotos se leen desde WebP público; no se guardan como base64. Publicar, pausar y reintentar son comandos auditados e idempotentes.</p>
          </article>
        </section>
      </div>
    </div>

    <nav class="mobile-nav" aria-label="Navegación principal">
      <button class="mobile-nav-button active" type="button" data-section-button="catalog"><span aria-hidden="true">□</span>Catálogo</button>
      <button class="mobile-nav-button" type="button" data-section-button="publications"><span aria-hidden="true">◉</span>Publicar</button>
      <button class="mobile-nav-button" type="button" data-section-button="summary"><span aria-hidden="true">≡</span>Resumen</button>
    </nav>
  </div>

  <dialog id="product-sheet" class="product-sheet" aria-labelledby="sheet-title">
    <form method="dialog" class="sheet-handle-row">
      <span class="sheet-handle" aria-hidden="true"></span>
      <button class="sheet-close" value="close" aria-label="Cerrar detalle">×</button>
    </form>
    <div id="sheet-content" class="sheet-content"></div>
    <div id="sheet-actions" class="sheet-actions"></div>
  </dialog>

  <dialog id="facebook-page-dialog" class="facebook-page-dialog" aria-labelledby="facebook-dialog-title">
    <form method="dialog" class="facebook-dialog-header">
      <div>
        <p class="eyebrow">Facebook</p>
        <h2 id="facebook-dialog-title">Elige la página</h2>
      </div>
      <button class="sheet-close" value="close" aria-label="Cerrar selección">×</button>
    </form>
    <p class="facebook-dialog-copy">Solo se muestran páginas donde tu autorización permite administrar contenido.</p>
    <div id="facebook-page-options" class="facebook-page-options"></div>
    <p id="facebook-dialog-message" class="message" role="status" aria-live="polite"></p>
  </dialog>

  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>`;

export const ADMIN_CATALOG_CSS = `:root {
  color-scheme: light;
  --ink: #101828;
  --muted: #667085;
  --border: #e4e7ec;
  --surface: #ffffff;
  --canvas: #f5f7fa;
  --brand: #d92d20;
  --brand-dark: #b42318;
  --success: #067647;
  --success-soft: #ecfdf3;
  --warning: #b54708;
  --warning-soft: #fffaeb;
  --danger-soft: #fef3f2;
  --blue: #175cd3;
  --blue-soft: #eff8ff;
  --shadow: 0 16px 36px rgba(16, 24, 40, 0.13);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html { min-width: 320px; background: var(--canvas); }
body { margin: 0; color: var(--ink); background: var(--canvas); }
button, input, select { font: inherit; }
button, select { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.48; }
[hidden] { display: none !important; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.auth-shell {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
  background: radial-gradient(circle at top right, #344054 0, #101828 46%, #0c111d 100%);
}

.auth-card {
  width: min(100%, 430px);
  padding: 28px 22px;
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.brand-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  margin-bottom: 24px;
  color: white;
  background: var(--brand);
  font-weight: 800;
  font-size: 22px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--brand);
  font-size: 12px;
  line-height: 1.4;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1, h2, h3, p { overflow-wrap: anywhere; }
h1 { margin: 0; font-size: 24px; line-height: 1.2; }
h2 { margin: 0; font-size: 22px; line-height: 1.25; }
h3 { margin: 0; font-size: 16px; line-height: 1.35; }
.auth-copy, .section-copy { color: var(--muted); line-height: 1.55; }
.auth-copy { margin: 12px 0 22px; }

label { color: #344054; font-size: 13px; font-weight: 700; }
input, select {
  width: 100%;
  min-height: 46px;
  border: 1px solid #d0d5dd;
  border-radius: 11px;
  padding: 10px 12px;
  color: var(--ink);
  background: white;
  outline: none;
}
input:focus, select:focus, button:focus-visible {
  border-color: #84adff;
  box-shadow: 0 0 0 4px rgba(47, 107, 255, 0.13);
}
#login-form { display: grid; gap: 8px; }
#login-form label:not(:first-child) { margin-top: 8px; }

.button, .icon-button, .nav-button, .mobile-nav-button, .sheet-close {
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 11px;
  padding: 10px 14px;
  font-weight: 750;
  line-height: 1.15;
}
.button.primary { color: white; background: var(--brand); }
.button.primary:hover { background: var(--brand-dark); }
.button.secondary { color: #344054; border-color: #d0d5dd; background: white; }
.button.danger { color: #b42318; border-color: #fecdca; background: var(--danger-soft); }
.button.wide { width: 100%; margin-top: 12px; }
.button.compact { min-height: 44px; padding-inline: 12px; font-size: 13px; }
.icon-button { color: #344054; border-color: #d0d5dd; background: white; }

.message { min-height: 20px; margin: 12px 0 0; color: #b42318; font-size: 13px; line-height: 1.45; }
.message.success { color: var(--success); }
.message.inline { min-height: 0; margin: 8px 0; }

.app-shell { min-height: 100dvh; padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
.app-header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: max(10px, env(safe-area-inset-top)) 16px 10px;
  color: white;
  background: var(--ink);
}
.app-header .eyebrow { color: #fda29b; }
.app-header h1 { font-size: 19px; }
.desktop-layout { max-width: 1280px; margin: 0 auto; }
.desktop-nav { display: none; }
.content-shell { min-width: 0; }

.context-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: white;
}
.select-field { display: grid; gap: 4px; }
.select-field span { color: var(--muted); font-size: 11px; }
.facebook-control {
  min-width: 0;
  min-height: 46px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  border: 1px solid #d0d5dd;
  border-radius: 11px;
  padding: 6px 7px 6px 11px;
  background: white;
}
.facebook-logo { width: 24px; height: 24px; color: #1877f2; }
.facebook-empty-text { min-width: 0; color: var(--ink) !important; font-size: 13px !important; font-weight: 750; }
.facebook-control select { min-width: 0; min-height: 44px; border: 0; padding-inline: 4px; box-shadow: none; }
.facebook-connect-button {
  grid-column: 1 / -1;
  min-height: 44px;
  border: 0;
  border-radius: 9px;
  padding: 10px 13px;
  color: white;
  background: #1877f2;
  font-weight: 800;
}
.facebook-connect-button:hover { background: #0f66d0; }
.facebook-connect-button:disabled { cursor: not-allowed; opacity: 0.55; }
.facebook-connect-button span { color: white; font-size: 13px; }

.section-panel { padding: 16px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-copy { margin: 8px 0 16px; font-size: 14px; }

.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 14px 0;
}
.stat-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
}
.stat-card strong { display: block; font-size: 19px; line-height: 1.2; }
.stat-card span { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; }
.stat-card.danger strong { color: var(--brand); }

.filters { display: grid; grid-template-columns: minmax(0, 1fr) 104px; gap: 8px; margin-bottom: 8px; }
.filters .button { grid-column: 1 / -1; }
.catalog-list { display: grid; gap: 10px; }
.product-card {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  min-height: 136px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: white;
  box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
}
.product-image-wrap { position: relative; min-width: 0; background: #eaecf0; }
.product-image { width: 100%; height: 100%; min-height: 136px; display: block; object-fit: cover; }
.product-placeholder { height: 100%; min-height: 136px; display: grid; place-items: center; color: #98a2b3; font-size: 34px; }
.product-card-body { min-width: 0; display: flex; flex-direction: column; gap: 6px; padding: 11px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  border-radius: 999px;
  padding: 3px 7px;
  color: #344054;
  background: #f2f4f7;
  font-size: 10px;
  font-weight: 750;
}
.chip.active, .chip.published, .chip.succeeded, .chip.completed { color: var(--success); background: var(--success-soft); }
.chip.paused, .chip.pending, .chip.processing, .chip.queued, .chip.running { color: var(--warning); background: var(--warning-soft); }
.chip.failed, .chip.blocked, .chip.uncertain, .chip.partially_failed { color: #b42318; background: var(--danger-soft); }
.product-title { font-size: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-meta { margin: 0; color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-price { margin: auto 0 0; color: var(--brand); font-size: 16px; font-weight: 850; }
.card-detail-button {
  min-height: 38px;
  border: 0;
  border-radius: 9px;
  margin-top: 2px;
  padding: 8px 10px;
  color: #344054;
  background: #f2f4f7;
  font-weight: 750;
}

.pager { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin: 16px 0 0; }
.pager span { color: var(--muted); font-size: 12px; text-align: center; }
.empty-state { padding: 34px 18px; border: 1px dashed #d0d5dd; border-radius: 16px; text-align: center; background: white; }
.empty-state p { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
.empty-icon { width: 48px; height: 48px; display: grid; place-items: center; margin: 0 auto 12px; border-radius: 50%; color: var(--muted); background: #f2f4f7; }

.batch-list { display: grid; gap: 10px; }
.batch-card { padding: 14px; border: 1px solid var(--border); border-radius: 14px; background: white; }
.batch-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.batch-meta { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
.progress-track { height: 8px; overflow: hidden; margin: 12px 0 8px; border-radius: 999px; background: #eaecf0; }
.progress-fill { height: 100%; border-radius: inherit; background: var(--success); }
.batch-counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; color: var(--muted); font-size: 11px; }
.batch-actions { display: flex; gap: 8px; margin-top: 12px; }

.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
.summary-card, .info-card { padding: 16px; border: 1px solid var(--border); border-radius: 15px; background: white; }
.summary-card strong { display: block; font-size: 26px; }
.summary-card span { color: var(--muted); font-size: 12px; }
.info-card { margin-top: 12px; }
.info-card p { margin: 8px 0 0; color: var(--muted); line-height: 1.55; font-size: 14px; }

.mobile-nav {
  position: fixed;
  z-index: 30;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(14px);
}
.mobile-nav-button { display: grid; place-items: center; gap: 2px; min-height: 50px; color: var(--muted); background: transparent; font-size: 11px; }
.mobile-nav-button span { font-size: 17px; }
.mobile-nav-button.active { color: var(--brand); background: var(--danger-soft); }

.product-sheet {
  width: 100%;
  max-width: none;
  max-height: min(88dvh, 780px);
  margin: auto 0 0;
  padding: 0;
  border: 0;
  border-radius: 22px 22px 0 0;
  color: var(--ink);
  background: white;
  box-shadow: var(--shadow);
}
.product-sheet::backdrop { background: rgba(16, 24, 40, 0.58); }
.facebook-page-dialog {
  width: min(100% - 24px, 520px);
  max-height: min(78dvh, 620px);
  padding: 0;
  border: 0;
  border-radius: 18px;
  color: var(--ink);
  background: white;
  box-shadow: var(--shadow);
}
.facebook-page-dialog::backdrop { background: rgba(16, 24, 40, 0.62); }
.facebook-dialog-header {
  position: sticky;
  z-index: 2;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 14px 56px 12px 18px;
  border-bottom: 1px solid var(--border);
  background: white;
}
.facebook-dialog-copy { margin: 14px 18px 10px; color: var(--muted); font-size: 13px; line-height: 1.5; }
.facebook-page-options { max-height: min(48dvh, 380px); overflow-y: auto; overscroll-behavior: contain; padding: 4px 18px 14px; }
.facebook-page-option {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 11px;
  margin-top: 8px;
  padding: 10px 12px;
  color: var(--ink);
  background: white;
  font-weight: 750;
  text-align: left;
}
.facebook-page-option:hover { border-color: #84adff; background: var(--blue-soft); }
.facebook-page-option .facebook-logo { flex: 0 0 24px; }
#facebook-dialog-message { margin: 0 18px 16px; }
.sheet-handle-row { position: sticky; z-index: 2; top: 0; display: flex; justify-content: center; min-height: 42px; background: white; }
.sheet-handle { width: 42px; height: 5px; margin-top: 9px; border-radius: 999px; background: #d0d5dd; }
.sheet-close { position: absolute; right: 8px; top: 4px; width: 44px; padding: 0; border: 0; color: #475467; background: transparent; font-size: 28px; }
.sheet-content { max-height: calc(88dvh - 132px); overflow-y: auto; overscroll-behavior: contain; padding: 0 16px 18px; }
.sheet-hero { aspect-ratio: 16 / 10; overflow: hidden; border-radius: 15px; background: #eaecf0; }
.sheet-hero img { width: 100%; height: 100%; display: block; object-fit: cover; }
.thumbnail-row { display: flex; gap: 8px; overflow-x: auto; padding: 10px 1px 4px; scrollbar-width: thin; }
.thumbnail-button { flex: 0 0 58px; width: 58px; height: 58px; overflow: hidden; padding: 0; border: 2px solid transparent; border-radius: 10px; background: #eaecf0; }
.thumbnail-button.active { border-color: var(--brand); }
.thumbnail-button img { width: 100%; height: 100%; object-fit: cover; }
.sheet-title-row { margin-top: 16px; }
.sheet-title-row h2 { margin-top: 4px; }
.sheet-description { color: #475467; line-height: 1.55; white-space: pre-wrap; }
.detail-block { padding: 14px 0; border-top: 1px solid var(--border); }
.detail-block h3 { margin-bottom: 8px; }
.price-row, .detail-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 13px; }
.price-row span:first-child, .detail-row span:first-child { color: var(--muted); }
.price-row strong, .detail-row strong { text-align: right; }
.error-panel { margin-top: 10px; padding: 11px; border-radius: 11px; color: #b42318; background: var(--danger-soft); font-size: 12px; }
.sheet-actions {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: white;
}
.sheet-actions .wide-action { grid-column: 1 / -1; }

.toast {
  position: fixed;
  z-index: 80;
  left: 16px;
  right: 16px;
  bottom: calc(84px + env(safe-area-inset-bottom));
  max-width: 520px;
  margin: 0 auto;
  padding: 13px 15px;
  border-radius: 12px;
  color: white;
  background: #101828;
  box-shadow: var(--shadow);
  font-size: 13px;
}
.toast.error { background: #b42318; }

@media (min-width: 520px) {
  .context-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .facebook-control { grid-template-columns: 24px minmax(0, 1fr) auto; }
  .facebook-connect-button { grid-column: auto; min-width: 142px; }
  .filters { grid-template-columns: minmax(0, 1fr) 132px auto; }
  .filters .button { grid-column: auto; }
  .catalog-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 768px) {
  .app-shell { padding-bottom: 0; }
  .app-header { padding-inline: 24px; }
  .desktop-layout { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 0; padding: 22px 24px; }
  .desktop-nav { display: grid; align-content: start; gap: 6px; padding: 12px; border: 1px solid var(--border); border-radius: 16px 0 0 16px; background: white; }
  .nav-button { text-align: left; color: #475467; background: transparent; }
  .nav-button.active { color: white; background: var(--ink); }
  .content-shell { border: 1px solid var(--border); border-left: 0; border-radius: 0 16px 16px 0; background: var(--canvas); }
  .context-bar { border-radius: 0 16px 0 0; padding: 14px 20px; }
  .section-panel { padding: 22px; }
  .stats-strip { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .catalog-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mobile-nav { display: none; }
  .product-sheet { width: min(720px, calc(100% - 48px)); max-height: 86dvh; margin: auto; border-radius: 22px; }
  .sheet-content { max-height: calc(86dvh - 124px); padding-inline: 22px; }
  .sheet-actions { padding-inline: 22px; }
  .toast { bottom: 24px; }
}

@media (min-width: 1100px) {
  .desktop-layout { grid-template-columns: 220px minmax(0, 1fr); }
  .catalog-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: no-preference) {
  .product-card, .button, .mobile-nav-button { transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease; }
  .product-card:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08); }
}
`;

export const ADMIN_CATALOG_JAVASCRIPT = `(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const state = {
    config: null,
    accessToken: null,
    organizations: [],
    organizationId: null,
    connectionId: null,
    page: null,
    pageNumber: 1,
    currentCursor: null,
    cursorHistory: [],
    activeSection: "catalog",
    selectedItem: null,
    loading: false,
    toastTimer: null,
    facebookPopup: null,
    facebookOAuthSessionId: null,
    facebookOAuthPages: [],
    facebookOAuthBusy: false,
  };

  const authView = byId("auth-view");
  const appView = byId("app-view");
  const loginForm = byId("login-form");
  const loginButton = byId("login-button");
  const loginMessage = byId("login-message");
  const organizationSelect = byId("organization-select");
  const connectionSelect = byId("connection-select");
  const facebookEmptyText = byId("facebook-empty-text");
  const connectFacebookButton = byId("connect-facebook-button");
  const connectFacebookLabel = byId("connect-facebook-label");
  const facebookPageDialog = byId("facebook-page-dialog");
  const facebookPageOptions = byId("facebook-page-options");
  const facebookDialogMessage = byId("facebook-dialog-message");
  const catalogList = byId("catalog-list");
  const catalogMessage = byId("catalog-message");
  const emptyCatalog = byId("empty-catalog");
  const emptyBatches = byId("empty-batches");
  const previousPage = byId("previous-page");
  const nextPage = byId("next-page");
  const pageLabel = byId("page-label");
  const productSheet = byId("product-sheet");
  const sheetContent = byId("sheet-content");
  const sheetActions = byId("sheet-actions");
  const toast = byId("toast");

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const setMessage = (element, text, success) => {
    element.textContent = text || "";
    element.classList.toggle("success", Boolean(success));
  };

  const showToast = (message, isError) => {
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", Boolean(isError));
    toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3600);
  };

  const apiFetch = async (url, options) => {
    const headers = new Headers((options && options.headers) || {});
    if (state.accessToken) headers.set("authorization", "Bearer " + state.accessToken);
    const response = await fetch(url, Object.assign({}, options || {}, { headers }));
    let payload = null;
    try { payload = await response.json(); } catch (_error) { payload = null; }
    if (!response.ok) {
      if (response.status === 401) logout("Tu sesión terminó. Vuelve a iniciar sesión.");
      const error = new Error(response.status === 409 ? "La acción ya fue enviada con otros datos." : "No fue posible completar la operación.");
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const groupInteger = (value) => {
    let result = "";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0 && (value.length - index) % 3 === 0) result += ",";
      result += value[index];
    }
    return result;
  };

  const formatDecimal = (value) => {
    const parts = String(value).split(".", 2);
    const integer = groupInteger(parts[0]);
    const decimals = parts.length > 1 ? parts[1].replace(/0+$/, "") : "";
    return decimals ? integer + "." + decimals : integer;
  };

  const formatPrice = (price) => {
    if (!price || price.pricingStatus === "on_request") return "Consultar precio";
    return (price.currencyCode || "MXN") + " $" + formatDecimal(price.amount);
  };

  const formatDate = (value) => {
    try {
      return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch (_error) {
      return value;
    }
  };

  const statusLabel = (status) => {
    const labels = {
      active: "Activo", paused: "Pausado", draft: "Borrador", archived: "Archivado",
      published: "Publicado", hidden: "Oculto", sold: "Vendido", unknown: "Por revisar",
      pending: "Pendiente", processing: "Procesando", retryable: "Reintento programado",
      succeeded: "Correcto", blocked: "Bloqueado", failed: "Falló", cancelled: "Cancelado",
      uncertain: "Verificando", queued: "En cola", running: "En curso", completed: "Completado",
      partially_failed: "Con fallos", expanding: "Preparando", cancelling: "Cancelando",
    };
    return labels[status] || status;
  };

  const chip = (status, label) => create("span", "chip " + status, label || statusLabel(status));

  const renderStats = () => {
    const summary = state.page.summary;
    const values = [
      [summary.total, "Productos", ""],
      [summary.active, "Activos", "active"],
      [summary.paused, "Pausados", "paused"],
      [summary.draft, "Borradores", ""],
      [summary.archived, "Archivados", ""],
      [summary.facebookErrors, "Errores FB", summary.facebookErrors ? "danger" : ""],
    ];
    const strip = byId("stats-strip");
    strip.replaceChildren();
    values.forEach((entry) => {
      const card = create("div", "stat-card " + entry[2]);
      card.append(create("strong", "", String(entry[0])), create("span", "", entry[1]));
      strip.append(card);
    });
    const summaryGrid = byId("summary-grid");
    summaryGrid.replaceChildren();
    values.forEach((entry) => {
      const card = create("article", "summary-card");
      card.append(create("strong", "", String(entry[0])), create("span", "", entry[1]));
      summaryGrid.append(card);
    });
  };

  const primaryMedia = (item) => item.media.find((media) => media.role === "primary") || item.media[0];

  const openSheet = (item) => {
    state.selectedItem = item;
    sheetContent.replaceChildren();
    sheetActions.replaceChildren();

    const media = primaryMedia(item);
    const hero = create("div", "sheet-hero");
    if (media) {
      const image = create("img");
      image.src = media.url;
      image.alt = media.altText || item.productName;
      image.width = media.width;
      image.height = media.height;
      hero.append(image);
    } else {
      hero.append(create("div", "product-placeholder", "□"));
    }
    sheetContent.append(hero);

    if (item.media.length > 1) {
      const thumbnails = create("div", "thumbnail-row");
      item.media.forEach((entry, index) => {
        const button = create("button", "thumbnail-button" + (entry.id === (media && media.id) ? " active" : ""));
        button.type = "button";
        button.setAttribute("aria-label", "Ver imagen " + String(index + 1));
        const image = create("img");
        image.src = entry.url;
        image.alt = entry.altText || "";
        button.append(image);
        button.addEventListener("click", () => {
          const heroImage = hero.querySelector("img");
          if (heroImage) {
            heroImage.src = entry.url;
            heroImage.alt = entry.altText || item.productName;
          }
          thumbnails.querySelectorAll("button").forEach((candidate) => candidate.classList.remove("active"));
          button.classList.add("active");
        });
        thumbnails.append(button);
      });
      sheetContent.append(thumbnails);
    }

    const titleRow = create("div", "sheet-title-row");
    titleRow.append(chip(item.variantStatus), create("h2", "", item.productName));
    titleRow.append(create("p", "product-meta", (item.sku || "Sin SKU") + " · " + item.category.name));
    sheetContent.append(titleRow);

    const description = item.variantDescription || item.productDescription || "Sin descripción disponible.";
    sheetContent.append(create("p", "sheet-description", description));

    const prices = create("section", "detail-block");
    prices.append(create("h3", "", "Presentaciones y precios"));
    if (item.prices.length === 0) {
      prices.append(create("p", "product-meta", "Aún no hay precio vigente."));
    } else {
      item.prices.forEach((price) => {
        const row = create("div", "price-row");
        const quantity = price.quantityMin === "1" ? price.unitName : price.quantityMin + " " + price.unitName;
        row.append(create("span", "", quantity), create("strong", "", formatPrice(price)));
        prices.append(row);
      });
    }
    sheetContent.append(prices);

    const facebook = create("section", "detail-block");
    facebook.append(create("h3", "", "Facebook"));
    if (!state.connectionId) {
      facebook.append(create("p", "product-meta", "Selecciona una página para ver y operar su publicación."));
    } else if (!item.facebook) {
      facebook.append(create("p", "product-meta", "La publicación todavía no tiene una versión aprobada para esta página."));
    } else {
      const statusRow = create("div", "detail-row");
      statusRow.append(create("span", "", "Estado"), chip(item.facebook.latestJobStatus || item.facebook.facebookStatus || item.facebook.publicationStatus));
      facebook.append(statusRow);
      if (item.facebook.externalUrl) {
        const link = create("a", "button secondary wide-action", "Abrir en Facebook");
        link.href = item.facebook.externalUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        facebook.append(link);
      }
      if (item.facebook.lastErrorCode) {
        facebook.append(create("div", "error-panel", "Error: " + item.facebook.lastErrorCode));
      }
      if (item.facebook.availableActions.includes("reconcile")) {
        facebook.append(create("div", "error-panel", "El efecto externo es incierto. El worker verificará Meta antes de permitir otro intento."));
      }
    }
    sheetContent.append(facebook);

    const toggle = create("button", item.variantStatus === "paused" ? "button secondary" : "button danger", item.variantStatus === "paused" ? "Activar" : "Pausar");
    toggle.type = "button";
    toggle.disabled = item.variantStatus !== "active" && item.variantStatus !== "paused";
    toggle.addEventListener("click", () => runCommand({
      type: "set_status",
      organizationId: state.organizationId,
      variantId: item.variantId,
      status: item.variantStatus === "paused" ? "active" : "paused",
      reason: item.variantStatus === "paused" ? "Activación solicitada desde el panel móvil" : "Pausa solicitada desde el panel móvil",
      idempotencyKey: crypto.randomUUID(),
    }, "Estado actualizado."));
    sheetActions.append(toggle);

    if (item.facebook && item.facebook.availableActions.includes("retry") && item.facebook.latestJobId) {
      const retry = create("button", "button primary", "Reintentar");
      retry.type = "button";
      retry.addEventListener("click", () => runCommand({
        type: "retry", organizationId: state.organizationId,
        publicationJobId: item.facebook.latestJobId, idempotencyKey: crypto.randomUUID(),
      }, "Reintento encolado."));
      sheetActions.append(retry);
    } else if (item.facebook && (item.facebook.availableActions.includes("publish") || item.facebook.availableActions.includes("refresh"))) {
      const operation = item.facebook.availableActions.includes("publish") ? "publish" : "refresh";
      const publish = create("button", "button primary", operation === "publish" ? "Publicar" : "Actualizar FB");
      publish.type = "button";
      publish.disabled = !state.connectionId;
      publish.addEventListener("click", () => runCommand({
        type: "publish", organizationId: state.organizationId, variantId: item.variantId,
        socialConnectionId: state.connectionId, operation: operation, idempotencyKey: crypto.randomUUID(),
      }, operation === "publish" ? "Publicación encolada." : "Actualización encolada."));
      sheetActions.append(publish);
    }

    if (!productSheet.open) productSheet.showModal();
  };

  const renderCatalog = () => {
    catalogList.replaceChildren();
    const items = state.page.items;
    items.forEach((item) => {
      const card = create("article", "product-card");
      const imageWrap = create("div", "product-image-wrap");
      const media = primaryMedia(item);
      if (media) {
        const image = create("img", "product-image");
        image.src = media.url;
        image.alt = media.altText || item.productName;
        image.loading = "lazy";
        image.width = media.width;
        image.height = media.height;
        imageWrap.append(image);
      } else {
        imageWrap.append(create("div", "product-placeholder", "□"));
      }
      const body = create("div", "product-card-body");
      const chips = create("div", "chip-row");
      chips.append(chip(item.variantStatus));
      if (item.facebook) chips.append(chip(item.facebook.latestJobStatus || item.facebook.facebookStatus || item.facebook.publicationStatus));
      body.append(chips, create("h3", "product-title", item.productName));
      body.append(create("p", "product-meta", (item.sku || "Sin SKU") + " · " + item.category.name));
      body.append(create("p", "product-price", formatPrice(item.prices[0])));
      const detail = create("button", "card-detail-button", "Ver y administrar");
      detail.type = "button";
      detail.addEventListener("click", () => openSheet(item));
      body.append(detail);
      card.append(imageWrap, body);
      catalogList.append(card);
    });
    emptyCatalog.hidden = items.length !== 0;
    previousPage.disabled = state.cursorHistory.length === 0 || state.loading;
    nextPage.disabled = !state.page.hasMore || state.loading;
    pageLabel.textContent = "Página " + String(state.pageNumber);
  };

  const setFacebookOAuthBusy = (busy) => {
    state.facebookOAuthBusy = Boolean(busy);
    connectFacebookButton.disabled = state.facebookOAuthBusy || !state.organizationId;
    connectFacebookLabel.textContent = state.facebookOAuthBusy
      ? "Conectando…"
      : state.page && state.page.connections.length
        ? "Conectar otra"
        : "Conectar Facebook";
    facebookPageOptions.querySelectorAll("button").forEach((button) => {
      button.disabled = state.facebookOAuthBusy;
    });
  };

  const closeFacebookPopup = () => {
    if (state.facebookPopup && !state.facebookPopup.closed) state.facebookPopup.close();
    state.facebookPopup = null;
  };

  const completeFacebookOAuth = async (pageId) => {
    if (!state.facebookOAuthSessionId || state.facebookOAuthBusy) return;
    setFacebookOAuthBusy(true);
    setMessage(facebookDialogMessage, "Guardando la conexión segura…", true);
    try {
      const result = await apiFetch("/admin/catalog/facebook/oauth/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          oauthSessionId: state.facebookOAuthSessionId,
          pageId: pageId,
        }),
      });
      state.connectionId = result.socialConnectionId;
      state.facebookOAuthSessionId = null;
      state.facebookOAuthPages = [];
      if (facebookPageDialog.open) facebookPageDialog.close();
      resetPagination();
      await loadPage();
      showToast("Página “" + result.pageName + "” conectada.", false);
    } catch (error) {
      setMessage(
        facebookDialogMessage,
        error.message || "No se pudo guardar esta página.",
        false,
      );
      showToast(error.message || "No se pudo conectar la página.", true);
    } finally {
      setFacebookOAuthBusy(false);
    }
  };

  const renderFacebookPageChoices = () => {
    facebookPageOptions.replaceChildren();
    state.facebookOAuthPages.forEach((page) => {
      const button = create("button", "facebook-page-option");
      button.type = "button";
      const logo = document.querySelector(".facebook-logo").cloneNode(true);
      logo.setAttribute("aria-hidden", "true");
      logo.removeAttribute("aria-label");
      const label = create("span", "", page.name);
      button.append(logo, label);
      button.addEventListener("click", () => completeFacebookOAuth(page.id));
      facebookPageOptions.append(button);
    });
    setMessage(facebookDialogMessage, "", false);
    if (!facebookPageDialog.open) facebookPageDialog.showModal();
  };

  const exchangeFacebookAuthorization = async (payload) => {
    if (state.facebookOAuthBusy) return;
    closeFacebookPopup();
    if (payload.error) {
      showToast("Facebook no autorizó la conexión.", true);
      return;
    }
    if (typeof payload.code !== "string" || typeof payload.state !== "string") {
      showToast("La respuesta de Facebook no es válida.", true);
      return;
    }
    setFacebookOAuthBusy(true);
    try {
      const result = await apiFetch("/admin/catalog/facebook/oauth/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: payload.code, state: payload.state }),
      });
      state.facebookOAuthSessionId = result.oauthSessionId;
      state.facebookOAuthPages = Array.isArray(result.pages) ? result.pages : [];
      if (state.facebookOAuthPages.length === 1) {
        setFacebookOAuthBusy(false);
        await completeFacebookOAuth(state.facebookOAuthPages[0].id);
        return;
      }
      if (!state.facebookOAuthPages.length) throw new Error("No hay páginas administrables.");
      renderFacebookPageChoices();
    } catch (error) {
      showToast(error.message || "No se pudo validar Facebook.", true);
    } finally {
      setFacebookOAuthBusy(false);
    }
  };

  const startFacebookOAuth = async () => {
    if (!state.organizationId || state.facebookOAuthBusy) return;
    closeFacebookPopup();
    const popup = window.open(
      "about:blank",
      "agentefer-facebook-oauth",
      "popup=yes,width=560,height=720,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      showToast("Permite ventanas emergentes para conectar Facebook.", true);
      return;
    }
    state.facebookPopup = popup;
    setFacebookOAuthBusy(true);
    try {
      const result = await apiFetch("/admin/catalog/facebook/oauth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: state.organizationId }),
      });
      const authorizationUrl = new URL(result.authorizationUrl);
      if (
        authorizationUrl.protocol !== "https:" ||
        authorizationUrl.hostname !== "www.facebook.com"
      ) {
        throw new Error("Facebook devolvió una dirección no válida.");
      }
      popup.location.replace(authorizationUrl.toString());
    } catch (error) {
      closeFacebookPopup();
      showToast(error.message || "No se pudo iniciar la conexión.", true);
    } finally {
      setFacebookOAuthBusy(false);
    }
  };

  const renderConnections = () => {
    const previous = state.connectionId;
    connectionSelect.replaceChildren();
    const placeholder = create("option", "", state.page.connections.length ? "Elige una página" : "Sin página conectada");
    placeholder.value = "";
    connectionSelect.append(placeholder);
    state.page.connections.forEach((connection) => {
      const option = create("option", "", connection.name);
      option.value = connection.id;
      connectionSelect.append(option);
    });
    state.connectionId = state.page.selectedConnectionId || previous || null;
    connectionSelect.value = state.connectionId || "";
    const hasConnections = state.page.connections.length > 0;
    connectionSelect.hidden = !hasConnections;
    facebookEmptyText.hidden = hasConnections;
    setFacebookOAuthBusy(state.facebookOAuthBusy);
    byId("publish-all-button").disabled = !state.connectionId || state.loading;
  };

  const renderBatches = () => {
    const list = byId("batch-list");
    list.replaceChildren();
    state.page.batches.forEach((batch) => {
      const card = create("article", "batch-card");
      const header = create("div", "batch-header");
      const title = create("div");
      title.append(create("h3", "", batch.operation === "publish" ? "Publicación de catálogo" : "Actualización de catálogo"));
      title.append(create("p", "batch-meta", formatDate(batch.createdAt)));
      header.append(title, chip(batch.status));
      card.append(header);
      const completed = batch.succeeded + batch.failed + batch.uncertain;
      const percent = batch.total > 0 ? Math.min(100, Math.round(completed * 100 / batch.total)) : 100;
      const track = create("div", "progress-track");
      const fill = create("div", "progress-fill");
      fill.style.width = String(percent) + "%";
      track.append(fill);
      card.append(track);
      const counts = create("div", "batch-counts");
      counts.append(create("span", "", String(batch.succeeded) + " correctas"));
      counts.append(create("span", "", String(batch.pending + batch.processing) + " pendientes"));
      counts.append(create("span", "", String(batch.failed + batch.uncertain) + " revisar"));
      card.append(counts);
      if (["pending", "queued", "running", "paused"].includes(batch.status)) {
        const actions = create("div", "batch-actions");
        const action = batch.status === "paused" ? "resume" : "pause";
        const button = create("button", "button secondary compact", action === "pause" ? "Pausar lote" : "Reanudar lote");
        button.type = "button";
        button.addEventListener("click", () => runCommand({
          type: "batch_state", organizationId: state.organizationId, publicationBatchId: batch.id,
          action: action, reason: action === "pause" ? "Pausa solicitada desde el panel móvil" : "Reanudación solicitada desde el panel móvil",
          idempotencyKey: crypto.randomUUID(),
        }, action === "pause" ? "Lote pausado." : "Lote reanudado."));
        actions.append(button);
        card.append(actions);
      }
      list.append(card);
    });
    emptyBatches.hidden = state.page.batches.length !== 0;
  };

  const renderPage = () => {
    renderConnections();
    renderStats();
    renderCatalog();
    renderBatches();
  };

  const pageSize = () => window.matchMedia("(min-width: 768px)").matches ? 12 : 6;

  const loadPage = async () => {
    if (!state.organizationId || state.loading) return;
    state.loading = true;
    catalogList.setAttribute("aria-busy", "true");
    setMessage(catalogMessage, "Actualizando catálogo…", true);
    try {
      const params = new URLSearchParams({
        organizationId: state.organizationId,
        status: byId("status-filter").value,
        pageSize: String(pageSize()),
      });
      const search = byId("catalog-search").value.trim();
      if (search) params.set("search", search);
      if (state.connectionId) params.set("socialConnectionId", state.connectionId);
      if (state.currentCursor) {
        params.set("cursorUpdatedAt", state.currentCursor.updatedAt);
        params.set("cursorVariantId", state.currentCursor.variantId);
      }
      state.page = await apiFetch("/admin/catalog/page?" + params.toString());
      renderPage();
      setMessage(catalogMessage, "", false);
    } catch (error) {
      setMessage(catalogMessage, error.message || "No se pudo cargar el catálogo.", false);
    } finally {
      state.loading = false;
      catalogList.setAttribute("aria-busy", "false");
      if (state.page) renderCatalog();
    }
  };

  const resetPagination = () => {
    state.pageNumber = 1;
    state.currentCursor = null;
    state.cursorHistory = [];
  };

  const runCommand = async (command, successMessage) => {
    if (state.loading) return;
    state.loading = true;
    sheetActions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      await apiFetch("/admin/catalog/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      if (productSheet.open) productSheet.close();
      showToast(successMessage, false);
      resetPagination();
    } catch (error) {
      showToast(error.message || "No se pudo completar la acción.", true);
    } finally {
      state.loading = false;
    }
    await loadPage();
  };

  const loadOrganizations = async () => {
    const payload = await apiFetch("/admin/organizations");
    state.organizations = payload.organizations || [];
    organizationSelect.replaceChildren();
    state.organizations.forEach((organization) => {
      const option = create("option", "", organization.name);
      option.value = organization.id;
      organizationSelect.append(option);
    });
    if (!state.organizations.length) throw new Error("Tu cuenta no tiene un negocio activo autorizado.");
    state.organizationId = state.organizations[0].id;
    organizationSelect.value = state.organizationId;
  };

  const logout = (message) => {
    closeFacebookPopup();
    if (facebookPageDialog.open) facebookPageDialog.close();
    state.accessToken = null;
    state.organizationId = null;
    state.connectionId = null;
    state.page = null;
    byId("password").value = "";
    appView.hidden = true;
    authView.hidden = false;
    setMessage(loginMessage, message || "Sesión cerrada.", false);
  };

  const switchSection = (section) => {
    state.activeSection = section;
    document.querySelectorAll("[data-section]").forEach((panel) => {
      const active = panel.dataset.section === section;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-section-button]").forEach((button) => {
      button.classList.toggle("active", button.dataset.sectionButton === section);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.config) return;
    loginButton.disabled = true;
    setMessage(loginMessage, "Validando cuenta…", true);
    try {
      const response = await fetch(state.config.supabaseUrl + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: state.config.publishableKey, "content-type": "application/json" },
        body: JSON.stringify({ email: byId("email").value.trim(), password: byId("password").value }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.access_token !== "string") throw new Error("Correo o contraseña incorrectos.");
      state.accessToken = payload.access_token;
      await loadOrganizations();
      authView.hidden = true;
      appView.hidden = false;
      resetPagination();
      await loadPage();
    } catch (error) {
      state.accessToken = null;
      setMessage(loginMessage, error.message || "No se pudo iniciar sesión.", false);
    } finally {
      loginButton.disabled = false;
    }
  });

  byId("logout-button").addEventListener("click", () => logout("Sesión cerrada."));
  organizationSelect.addEventListener("change", async () => {
    closeFacebookPopup();
    if (facebookPageDialog.open) facebookPageDialog.close();
    state.facebookOAuthSessionId = null;
    state.facebookOAuthPages = [];
    state.organizationId = organizationSelect.value;
    state.connectionId = null;
    resetPagination();
    await loadPage();
  });
  connectionSelect.addEventListener("change", async () => {
    state.connectionId = connectionSelect.value || null;
    resetPagination();
    await loadPage();
  });
  connectFacebookButton.addEventListener("click", startFacebookOAuth);
  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== state.facebookPopup ||
      !event.data ||
      event.data.type !== "agentefer.facebook-oauth"
    ) return;
    exchangeFacebookAuthorization(event.data);
  });
  if ("BroadcastChannel" in window) {
    const facebookOAuthChannel = new BroadcastChannel("agentefer-facebook-oauth");
    facebookOAuthChannel.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "agentefer.facebook-oauth") return;
      exchangeFacebookAuthorization(event.data);
    });
  }
  byId("filters-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    resetPagination();
    await loadPage();
  });
  previousPage.addEventListener("click", async () => {
    if (!state.cursorHistory.length) return;
    state.currentCursor = state.cursorHistory.pop() || null;
    state.pageNumber -= 1;
    await loadPage();
    byId("catalog-title").scrollIntoView({ block: "start" });
  });
  nextPage.addEventListener("click", async () => {
    if (!state.page || !state.page.nextCursor) return;
    state.cursorHistory.push(state.currentCursor);
    state.currentCursor = state.page.nextCursor;
    state.pageNumber += 1;
    await loadPage();
    byId("catalog-title").scrollIntoView({ block: "start" });
  });
  byId("publish-all-button").addEventListener("click", async () => {
    if (!state.connectionId) return;
    if (!window.confirm("Se encolarán únicamente los productos activos y aprobados. ¿Continuar?")) return;
    await runCommand({
      type: "publish_all", organizationId: state.organizationId,
      socialConnectionId: state.connectionId, operation: "publish", idempotencyKey: crypto.randomUUID(),
    }, "Catálogo encolado. Puedes seguir usando el agente.");
  });
  byId("refresh-publications").addEventListener("click", loadPage);
  document.querySelectorAll("[data-section-button]").forEach((button) => {
    button.addEventListener("click", () => switchSection(button.dataset.sectionButton));
  });

  const start = async () => {
    try {
      state.config = await fetch("/admin/catalog/config", { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Configuración no disponible.");
        return response.json();
      });
    } catch (_error) {
      setMessage(loginMessage, "El panel no está disponible en este momento.", false);
      loginButton.disabled = true;
    }
  };

  start();
})();`;

export const ADMIN_CATALOG_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#101828"/>
  <path d="M16 21l16-9 16 9v22l-16 9-16-9V21zm16-2.2L23.5 23 32 27.2 40.5 23 32 18.8zM22 28v11.5l7 3.9V31.5L22 28zm13 3.5v11.9l7-3.9V28l-7 3.5z" fill="#fff"/>
  <circle cx="48" cy="16" r="8" fill="#d92d20"/>
</svg>`;
