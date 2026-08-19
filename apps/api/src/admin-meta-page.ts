export const ADMIN_META_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>Integraciones Meta · AgenteFer</title>
    <link rel="icon" href="/admin/meta/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/admin/meta/app.css">
    <script src="/admin/meta/app.js" defer></script>
  </head>
  <body>
    <div class="ambient ambient-one" aria-hidden="true"></div>
    <div class="ambient ambient-two" aria-hidden="true"></div>

    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/admin/meta" aria-label="AgenteFer, centro de control">
          <span class="brand-mark" aria-hidden="true">AF</span>
          <span>
            <strong>AgenteFer</strong>
            <small>Centro de control</small>
          </span>
        </a>
        <div class="security-chip">Conexión cifrada</div>
      </header>

      <main>
        <section class="hero" aria-labelledby="page-title">
          <div class="eyebrow">Integraciones · Meta</div>
          <h1 id="page-title">Conecta WhatsApp y Messenger sin mezclar cuentas.</h1>
          <p>
            Cada organización conserva su propia App, endpoint y credenciales cifradas. Tú eliges
            el negocio antes de registrar cualquier dato.
          </p>
        </section>

        <section id="login-panel" class="login-layout" aria-labelledby="login-title">
          <div class="trust-panel">
            <p class="section-kicker">Frontera de seguridad</p>
            <h2>Los secretos no viven en esta pantalla.</h2>
            <p>
              Viajan una sola vez por HTTPS y se cifran dentro de Supabase Vault. No se guardan
              en el navegador, en EasyPanel ni en los registros del servidor.
            </p>
            <dl class="trust-grid">
              <div>
                <dt>Aislamiento</dt>
                <dd>Por organización</dd>
              </div>
              <div>
                <dt>Autorización</dt>
                <dd>Owner o admin</dd>
              </div>
              <div>
                <dt>Persistencia local</dt>
                <dd>Ninguna</dd>
              </div>
            </dl>
          </div>

          <div class="card login-card">
            <div class="card-heading">
              <p class="section-kicker">Acceso administrativo</p>
              <h2 id="login-title">Inicia sesión</h2>
              <p>Usa la cuenta autorizada en AgenteFer.</p>
            </div>

            <form id="login-form" novalidate>
              <div class="field">
                <label for="login-email">Correo</label>
                <input id="login-email" name="email" type="email" autocomplete="email" required>
              </div>
              <div class="field">
                <label for="login-password">Contraseña</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                >
              </div>
              <p id="login-message" class="form-message" role="status" aria-live="polite"></p>
              <button id="login-submit" class="button button-primary" type="submit">
                Entrar de forma segura
              </button>
            </form>
          </div>
        </section>

        <section id="workspace" class="workspace" hidden aria-labelledby="workspace-title">
          <aside class="context-panel">
            <div>
              <p class="section-kicker">Contexto activo</p>
              <h2 id="workspace-title">Organización</h2>
              <p class="context-copy">
                Todo lo que registres quedará encerrado dentro de la organización seleccionada.
              </p>
            </div>

            <div class="field">
              <label for="organization-select">Negocio</label>
              <select id="organization-select" name="organization" required></select>
            </div>

            <div class="context-proof">
              <span class="proof-dot" aria-hidden="true"></span>
              <div>
                <strong>RLS activo</strong>
                <span>Solo ves organizaciones donde eres miembro.</span>
              </div>
            </div>

            <button id="logout-button" class="button button-quiet" type="button">Cerrar sesión</button>
          </aside>

          <div class="card integration-card">
            <div class="card-heading card-heading-wide">
              <div>
                <p class="section-kicker">Nueva conexión</p>
                <h2>Aplicación de Meta</h2>
                <p>Primero registramos la App y el webhook. Después conectaremos cada canal.</p>
              </div>
              <div class="vault-badge">Protegido por Vault</div>
            </div>

            <form id="meta-form" novalidate>
              <div class="form-grid">
                <div class="field">
                  <label for="external-app-id">Identificador de la App</label>
                  <input
                    id="external-app-id"
                    name="externalAppId"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    maxlength="255"
                    required
                  >
                  <small>El App ID que aparece en Meta Developers.</small>
                </div>

                <div class="field">
                  <label for="display-name">Nombre para reconocerla</label>
                  <input
                    id="display-name"
                    name="displayName"
                    type="text"
                    autocomplete="off"
                    maxlength="160"
                    required
                  >
                  <small>Ejemplo: Pruebas Frank o Producción Fer.</small>
                </div>

                <div class="field">
                  <label for="api-version">Versión Graph API</label>
                  <input
                    id="api-version"
                    name="apiVersion"
                    type="text"
                    autocomplete="off"
                    maxlength="32"
                    placeholder="Ejemplo: v26.0"
                    required
                  >
                  <small>Copia la versión mostrada en la configuración de Meta.</small>
                </div>

                <div class="field">
                  <label for="app-secret">App Secret</label>
                  <div class="input-action">
                    <input
                      id="app-secret"
                      name="appSecret"
                      type="password"
                      autocomplete="new-password"
                      minlength="16"
                      required
                    >
                    <button
                      class="field-action"
                      type="button"
                      data-toggle-secret="app-secret"
                      aria-pressed="false"
                    >Mostrar</button>
                  </div>
                  <small>Se limpia de esta pantalla inmediatamente después del envío.</small>
                </div>
              </div>

              <div class="token-panel">
                <div>
                  <p class="token-title">Token de verificación del webhook</p>
                  <p class="token-copy">
                    AgenteFer genera un token fuerte. Lo copiarás en Meta cuando registremos el
                    endpoint.
                  </p>
                </div>
                <div class="field token-field">
                  <label class="sr-only" for="verify-token">Token de verificación</label>
                  <div class="input-action input-action-token">
                    <input id="verify-token" type="password" readonly aria-describedby="token-help">
                    <button
                      class="field-action"
                      type="button"
                      data-toggle-secret="verify-token"
                      aria-pressed="false"
                    >Mostrar</button>
                    <button class="field-action" id="copy-token" type="button">Copiar</button>
                  </div>
                  <small id="token-help">Puedes generar uno nuevo antes de guardar.</small>
                </div>
                <button id="regenerate-token" class="button button-secondary" type="button">
                  Generar otro token
                </button>
              </div>

              <p id="meta-message" class="form-message" role="status" aria-live="polite"></p>

              <div class="form-actions">
                <p>Al guardar se crea una versión cifrada e inmutable para esta organización.</p>
                <button id="meta-submit" class="button button-primary" type="submit">
                  Registrar aplicación
                </button>
              </div>
            </form>

            <section id="registration-result" class="result-panel" hidden aria-labelledby="result-title">
              <div class="result-heading">
                <div>
                  <p class="section-kicker">Registro completado</p>
                  <h3 id="result-title">Tu endpoint está listo para Meta.</h3>
                </div>
                <span class="success-badge">Guardado</span>
              </div>

              <div class="field">
                <label for="callback-url">URL de devolución de llamada</label>
                <div class="input-action">
                  <input id="callback-url" type="url" readonly>
                  <button class="field-action" id="copy-callback" type="button">Copiar</button>
                </div>
              </div>

              <div class="field">
                <label for="result-token">Token de verificación</label>
                <div class="input-action">
                  <input id="result-token" type="password" readonly>
                  <button
                    class="field-action"
                    type="button"
                    data-toggle-secret="result-token"
                    aria-pressed="false"
                  >Mostrar</button>
                  <button class="field-action" id="copy-result-token" type="button">Copiar</button>
                </div>
              </div>

              <p class="result-note">
                Conserva esta pantalla abierta mientras configuras el webhook. AgenteFer no volverá
                a mostrar el token después de recargar.
              </p>
            </section>
          </div>
        </section>
      </main>

      <footer>
        <span>AgenteFer</span>
        <span>Configuración multi-organización protegida</span>
      </footer>
    </div>
  </body>
</html>`;

export const ADMIN_META_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AgenteFer">
  <defs>
    <linearGradient id="g" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
      <stop stop-color="#53e6a5"/>
      <stop offset="1" stop-color="#24a86f"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="#101312"/>
  <path d="M16 46 27.5 17h9L48 46h-8.3l-2.1-6H26.3l-2.1 6H16Zm12.7-13h6.5L32 23.4 28.7 33Z" fill="url(#g)"/>
</svg>`;

export const ADMIN_META_CSS = `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --background: #0b0d0c;
  --surface: #111412;
  --surface-raised: #161a17;
  --surface-soft: #1a1e1b;
  --border: #2a302c;
  --border-strong: #3a433d;
  --text: #edf4ef;
  --text-muted: #9ca9a1;
  --text-soft: #6f7b74;
  --green: #3ecf8e;
  --green-strong: #2ebf7d;
  --green-ink: #062e20;
  --danger: #ff8a8a;
  --warning: #f3c56b;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--background);
}

body {
  min-height: 100vh;
  margin: 0;
  overflow-x: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at 20% -10%, rgba(62, 207, 142, 0.08), transparent 28rem),
    linear-gradient(180deg, #0d100e 0%, var(--background) 44%, #090b0a 100%);
}

button,
input,
select {
  font: inherit;
}

button,
a,
select {
  cursor: pointer;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: 3px;
}

[hidden] {
  display: none !important;
}

.ambient {
  position: fixed;
  z-index: -1;
  width: 28rem;
  height: 28rem;
  border-radius: 999px;
  filter: blur(110px);
  opacity: 0.12;
  pointer-events: none;
}

.ambient-one {
  top: 10%;
  right: -18rem;
  background: var(--green);
}

.ambient-two {
  bottom: -18rem;
  left: -14rem;
  background: #1e88ff;
  opacity: 0.07;
}

.shell {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88px;
  border-bottom: 1px solid rgba(58, 67, 61, 0.72);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(62, 207, 142, 0.48);
  border-radius: 11px;
  color: var(--green);
  background: linear-gradient(145deg, rgba(62, 207, 142, 0.14), rgba(62, 207, 142, 0.03));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.04);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}

.brand small {
  margin-top: 3px;
  color: var(--text-soft);
  font-size: 0.72rem;
}

.security-chip,
.vault-badge,
.success-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  border: 1px solid rgba(62, 207, 142, 0.26);
  border-radius: 999px;
  padding: 0 12px;
  color: #a5e8c8;
  background: rgba(62, 207, 142, 0.07);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.hero {
  max-width: 850px;
  padding: 76px 0 54px;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: var(--green);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero h1 {
  max-width: 820px;
  margin: 18px 0 18px;
  font-size: clamp(2.3rem, 5vw, 4.5rem);
  font-weight: 590;
  letter-spacing: -0.055em;
  line-height: 0.99;
  text-wrap: balance;
}

.hero > p {
  max-width: 680px;
  margin: 0;
  color: var(--text-muted);
  font-size: clamp(1rem, 1.5vw, 1.14rem);
  line-height: 1.72;
}

.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(330px, 0.72fr);
  gap: 22px;
  align-items: stretch;
  margin-bottom: 80px;
}

.trust-panel,
.card,
.context-panel {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(22, 26, 23, 0.96), rgba(15, 18, 16, 0.97));
  box-shadow: var(--shadow);
}

.trust-panel {
  min-height: 410px;
  padding: clamp(28px, 4.5vw, 58px);
  background:
    linear-gradient(145deg, rgba(62, 207, 142, 0.08), transparent 55%),
    linear-gradient(180deg, rgba(22, 26, 23, 0.96), rgba(15, 18, 16, 0.97));
}

.trust-panel h2,
.card-heading h2,
.context-panel h2 {
  margin: 12px 0 12px;
  font-size: clamp(1.45rem, 2.5vw, 2rem);
  font-weight: 590;
  letter-spacing: -0.035em;
}

.trust-panel > p:not(.section-kicker),
.card-heading p,
.context-copy {
  color: var(--text-muted);
  line-height: 1.65;
}

.trust-panel > p:not(.section-kicker) {
  max-width: 600px;
}

.trust-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 52px 0 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--border);
}

.trust-grid div {
  padding: 18px;
  background: rgba(13, 16, 14, 0.92);
}

.trust-grid dt {
  margin-bottom: 9px;
  color: var(--text-soft);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.trust-grid dd {
  margin: 0;
  font-size: 0.87rem;
  font-weight: 570;
}

.login-card,
.integration-card {
  padding: 30px;
}

.card-heading {
  margin-bottom: 28px;
}

.card-heading p {
  margin-top: 0;
  margin-bottom: 0;
}

.card-heading-wide,
.result-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
}

.field + .field {
  margin-top: 18px;
}

.field label,
.token-title {
  color: #dce5df;
  font-size: 0.82rem;
  font-weight: 590;
}

.field small,
.token-copy,
.form-actions p,
.result-note {
  color: var(--text-soft);
  font-size: 0.76rem;
  line-height: 1.55;
}

input,
select {
  width: 100%;
  min-height: 45px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 0 13px;
  color: var(--text);
  background: #0d100e;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

input:hover,
select:hover {
  border-color: #4b5750;
}

input:focus,
select:focus {
  border-color: rgba(62, 207, 142, 0.75);
  background: #0f1310;
  box-shadow: 0 0 0 3px rgba(62, 207, 142, 0.09);
  outline: none;
}

input[readonly] {
  color: #bdc9c1;
  background: #0b0e0c;
}

.button,
.field-action {
  border: 0;
  border-radius: 8px;
  font-weight: 620;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.button {
  min-height: 44px;
  padding: 0 18px;
}

.button:disabled,
.field-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.button-primary {
  color: var(--green-ink);
  background: var(--green);
  box-shadow: 0 8px 26px rgba(62, 207, 142, 0.14);
}

.button-primary:hover:not(:disabled) {
  background: #59daa0;
}

.button-secondary,
.button-quiet {
  border: 1px solid var(--border-strong);
  color: #cad4cd;
  background: #171b18;
}

.button-secondary:hover:not(:disabled),
.button-quiet:hover:not(:disabled) {
  border-color: #536158;
  background: #1d231f;
}

.button-quiet {
  width: 100%;
}

.login-card .button-primary {
  width: 100%;
  margin-top: 8px;
}

.form-message {
  min-height: 22px;
  margin: 14px 0 6px;
  color: var(--danger);
  font-size: 0.78rem;
  line-height: 1.5;
}

.form-message[data-state="success"] {
  color: #8ce0b8;
}

.workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
  margin-bottom: 80px;
}

.context-panel {
  position: sticky;
  top: 22px;
  display: grid;
  gap: 28px;
  padding: 24px;
}

.context-copy {
  margin: 0;
  font-size: 0.84rem;
}

.context-proof {
  display: flex;
  gap: 11px;
  border: 1px solid rgba(62, 207, 142, 0.16);
  border-radius: 10px;
  padding: 14px;
  background: rgba(62, 207, 142, 0.045);
}

.proof-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 4px rgba(62, 207, 142, 0.09);
}

.context-proof strong,
.context-proof span {
  display: block;
}

.context-proof strong {
  margin-bottom: 4px;
  font-size: 0.78rem;
}

.context-proof span {
  color: var(--text-soft);
  font-size: 0.72rem;
  line-height: 1.45;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.form-grid .field + .field {
  margin-top: 0;
}

.input-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.input-action input {
  border-radius: 8px 0 0 8px;
}

.input-action-token {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.field-action {
  min-height: 45px;
  border: 1px solid var(--border-strong);
  border-left: 0;
  border-radius: 0;
  padding: 0 13px;
  color: var(--text-muted);
  background: #171b18;
  font-size: 0.74rem;
}

.field-action:last-child {
  border-radius: 0 8px 8px 0;
}

.field-action:hover:not(:disabled) {
  color: var(--text);
  background: #202621;
}

.token-panel {
  display: grid;
  grid-template-columns: minmax(180px, 0.72fr) minmax(260px, 1fr) auto;
  gap: 18px;
  align-items: end;
  margin-top: 28px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  background: rgba(10, 13, 11, 0.62);
}

.token-title,
.token-copy {
  margin: 0;
}

.token-copy {
  margin-top: 7px;
}

.token-field.field + .field,
.token-field {
  margin-top: 0;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 6px;
  border-top: 1px solid var(--border);
  padding-top: 22px;
}

.form-actions p {
  max-width: 490px;
  margin: 0;
}

.result-panel {
  margin-top: 30px;
  border: 1px solid rgba(62, 207, 142, 0.28);
  border-radius: 13px;
  padding: 22px;
  background: linear-gradient(145deg, rgba(62, 207, 142, 0.07), rgba(62, 207, 142, 0.02));
}

.result-heading {
  margin-bottom: 22px;
}

.result-heading h3 {
  margin: 9px 0 0;
  font-size: 1.2rem;
  font-weight: 590;
  letter-spacing: -0.025em;
}

.result-note {
  margin: 18px 0 0;
  color: var(--warning);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid rgba(58, 67, 61, 0.62);
  padding: 26px 0 34px;
  color: var(--text-soft);
  font-size: 0.72rem;
}

@media (max-width: 900px) {
  .login-layout,
  .workspace {
    grid-template-columns: 1fr;
  }

  .context-panel {
    position: static;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.65fr);
  }

  .context-panel .button-quiet,
  .context-proof {
    grid-column: 1 / -1;
  }

  .token-panel {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

@media (max-width: 680px) {
  .shell {
    width: min(100% - 24px, 1180px);
  }

  .topbar {
    min-height: 72px;
  }

  .security-chip {
    display: none;
  }

  .hero {
    padding: 52px 4px 38px;
  }

  .hero h1 {
    font-size: clamp(2.25rem, 12vw, 3.4rem);
  }

  .trust-panel,
  .login-card,
  .integration-card,
  .context-panel {
    border-radius: 13px;
    padding: 22px;
  }

  .trust-panel {
    min-height: 0;
  }

  .trust-grid,
  .form-grid,
  .context-panel {
    grid-template-columns: 1fr;
  }

  .trust-grid {
    margin-top: 34px;
  }

  .card-heading-wide,
  .form-actions,
  .result-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .form-actions .button,
  .token-panel .button {
    width: 100%;
  }

  .vault-badge,
  .success-badge {
    align-self: flex-start;
  }

  .input-action-token {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .input-action-token input {
    grid-column: 1 / -1;
    border-radius: 8px 8px 0 0;
  }

  .input-action-token .field-action {
    border-top: 0;
    border-left: 1px solid var(--border-strong);
  }

  .input-action-token .field-action:nth-child(2) {
    border-radius: 0 0 0 8px;
  }

  .input-action-token .field-action:last-child {
    border-radius: 0 0 8px 0;
  }

  footer {
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}`;

export const ADMIN_META_JAVASCRIPT = `"use strict";

(() => {
  const state = {
    config: null,
    accessToken: null,
    verifyToken: "",
  };

  const element = (id) => {
    const value = document.getElementById(id);
    if (value === null) {
      throw new Error("Required page element is missing");
    }
    return value;
  };

  const loginPanel = element("login-panel");
  const workspace = element("workspace");
  const loginForm = element("login-form");
  const loginEmail = element("login-email");
  const loginPassword = element("login-password");
  const loginSubmit = element("login-submit");
  const loginMessage = element("login-message");
  const organizationSelect = element("organization-select");
  const metaForm = element("meta-form");
  const metaSubmit = element("meta-submit");
  const metaMessage = element("meta-message");
  const appSecret = element("app-secret");
  const verifyToken = element("verify-token");
  const registrationResult = element("registration-result");
  const callbackUrl = element("callback-url");
  const resultToken = element("result-token");

  const setMessage = (target, message, stateName) => {
    target.textContent = message;
    if (stateName === undefined) {
      target.removeAttribute("data-state");
    } else {
      target.setAttribute("data-state", stateName);
    }
  };

  const setButtonBusy = (button, busy, busyLabel, idleLabel) => {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : idleLabel;
  };

  const generateVerifyToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  };

  const setVerifyToken = (value) => {
    state.verifyToken = value;
    verifyToken.value = value;
  };

  const readJson = async (response) => {
    const text = await response.text();
    if (text.length === 0 || text.length > 65536) {
      throw new Error("Respuesta inválida del servidor");
    }
    return JSON.parse(text);
  };

  const copyText = async (value, button) => {
    await navigator.clipboard.writeText(value);
    const previous = button.textContent;
    button.textContent = "Copiado";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1400);
  };

  const resetSession = () => {
    state.accessToken = null;
    state.verifyToken = "";
    loginPassword.value = "";
    appSecret.value = "";
    metaForm.reset();
    organizationSelect.replaceChildren();
    registrationResult.hidden = true;
    workspace.hidden = true;
    loginPanel.hidden = false;
    setMessage(loginMessage, "", undefined);
    setMessage(metaMessage, "", undefined);
  };

  const loadOrganizations = async () => {
    const response = await fetch("/admin/organizations", {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer " + state.accessToken,
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });

    if (response.status === 401) {
      resetSession();
      throw new Error("Tu sesión venció. Inicia sesión otra vez.");
    }

    const payload = await readJson(response);
    if (!response.ok || !Array.isArray(payload.organizations)) {
      throw new Error("No fue posible cargar tus organizaciones.");
    }

    organizationSelect.replaceChildren();
    for (const organization of payload.organizations) {
      const option = document.createElement("option");
      option.value = organization.id;
      option.textContent = organization.name;
      organizationSelect.append(option);
    }

    if (payload.organizations.length === 0) {
      throw new Error("Tu usuario no tiene una organización activa.");
    }
  };

  const initialize = async () => {
    const response = await fetch("/admin/meta/config", {
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    const payload = await readJson(response);
    if (!response.ok || typeof payload.supabaseUrl !== "string" || typeof payload.publishableKey !== "string") {
      throw new Error("La configuración segura no está disponible.");
    }
    state.config = payload;
    setVerifyToken(generateVerifyToken());
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(loginMessage, "", undefined);

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    if (state.config === null) {
      setMessage(loginMessage, "La configuración todavía no está disponible.", undefined);
      return;
    }

    setButtonBusy(loginSubmit, true, "Verificando…", "Entrar de forma segura");
    let payload = null;
    try {
      const response = await fetch(state.config.supabaseUrl + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: {
          accept: "application/json",
          apikey: state.config.publishableKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail.value.trim(),
          password: loginPassword.value,
        }),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });

      payload = await readJson(response);
      loginPassword.value = "";
      if (!response.ok || typeof payload.access_token !== "string") {
        throw new Error("Correo o contraseña incorrectos.");
      }

      state.accessToken = payload.access_token;
      payload = null;
      await loadOrganizations();
      loginPanel.hidden = true;
      workspace.hidden = false;
      setMessage(metaMessage, "Sesión verificada. Selecciona el negocio y registra su App.", "success");
    } catch (error) {
      state.accessToken = null;
      loginPassword.value = "";
      setMessage(
        loginMessage,
        error instanceof Error ? error.message : "No fue posible iniciar sesión.",
        undefined,
      );
    } finally {
      payload = null;
      setButtonBusy(loginSubmit, false, "Verificando…", "Entrar de forma segura");
    }
  });

  metaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(metaMessage, "", undefined);
    registrationResult.hidden = true;

    if (!metaForm.checkValidity()) {
      metaForm.reportValidity();
      return;
    }

    if (state.accessToken === null || state.verifyToken.length < 16) {
      setMessage(metaMessage, "La sesión o el token de verificación no son válidos.", undefined);
      return;
    }

    setButtonBusy(metaSubmit, true, "Cifrando en Vault…", "Registrar aplicación");
    try {
      const response = await fetch("/admin/meta/applications", {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: "Bearer " + state.accessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organizationSelect.value,
          externalAppId: element("external-app-id").value.trim(),
          displayName: element("display-name").value.trim(),
          apiVersion: element("api-version").value.trim(),
          appSecret: appSecret.value,
          webhookVerifyToken: state.verifyToken,
        }),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });

      appSecret.value = "";
      const payload = await readJson(response);
      if (response.status === 401) {
        resetSession();
        throw new Error("Tu sesión venció. Inicia sesión otra vez.");
      }
      if (response.status === 403) {
        throw new Error("Necesitas ser owner o admin de esta organización.");
      }
      if (response.status === 409) {
        throw new Error("Esta App ya está registrada en una organización activa.");
      }
      if (!response.ok || typeof payload.callbackUrl !== "string") {
        throw new Error("No fue posible registrar la App. Intenta nuevamente.");
      }

      callbackUrl.value = payload.callbackUrl;
      resultToken.value = state.verifyToken;
      registrationResult.hidden = false;
      setMessage(metaMessage, "Aplicación registrada y credenciales cifradas.", "success");
      registrationResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      appSecret.value = "";
      setMessage(
        metaMessage,
        error instanceof Error ? error.message : "No fue posible registrar la App.",
        undefined,
      );
    } finally {
      setButtonBusy(metaSubmit, false, "Cifrando en Vault…", "Registrar aplicación");
    }
  });

  document.querySelectorAll("[data-toggle-secret]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-toggle-secret");
      const target = targetId === null ? null : document.getElementById(targetId);
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const showing = target.type === "text";
      target.type = showing ? "password" : "text";
      button.textContent = showing ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-pressed", showing ? "false" : "true");
    });
  });

  element("regenerate-token").addEventListener("click", () => {
    setVerifyToken(generateVerifyToken());
    registrationResult.hidden = true;
    setMessage(metaMessage, "Se generó un token nuevo.", "success");
  });

  element("copy-token").addEventListener("click", async (event) => {
    await copyText(state.verifyToken, event.currentTarget);
  });

  element("copy-callback").addEventListener("click", async (event) => {
    await copyText(callbackUrl.value, event.currentTarget);
  });

  element("copy-result-token").addEventListener("click", async (event) => {
    await copyText(resultToken.value, event.currentTarget);
  });

  element("logout-button").addEventListener("click", resetSession);

  void initialize().catch((error) => {
    setMessage(
      loginMessage,
      error instanceof Error ? error.message : "No fue posible iniciar la pantalla.",
      undefined,
    );
    loginSubmit.disabled = true;
  });
})();`;
