/**
 * Stylesheet for the standalone verdict report. It is inlined into verdict.html;
 * no fonts, images or other resources are loaded from the network.
 */
export const REPORT_CSS = `
:root {
  color-scheme: dark;
  --topbar-h: 64px;
  --font-serif: Georgia, "Times New Roman", "PT Serif", serif;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas, "Liberation Mono", monospace;
  --bg: #121419;
  --bg-deep: #0d0f13;
  --surface: #191c23;
  --surface-2: #20242d;
  --surface-3: #272c37;
  --ink: #ece5d8;
  --ink-soft: #d8d1c4;
  --muted: #a7aebc;
  --line: #323845;
  --line-strong: #4a5263;
  --gold: #d8b45f;
  --gold-soft: #b99549;
  --focus: #83b6ff;
  --topbar-bg: rgba(18, 20, 25, 0.9);
  --shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.25);
  --approve-fg: #8bd6a9;
  --approve-bg: #17271e;
  --approve-bd: #2e5a41;
  --conditions-fg: #e8c477;
  --conditions-bg: #2a2315;
  --conditions-bd: #5c4a24;
  --reject-fg: #f09a92;
  --reject-bg: #2b1917;
  --reject-bd: #5f302b;
  --insufficient-fg: #b8c2d1;
  --insufficient-bg: #1d222b;
  --insufficient-bd: #3a4352;
  --unknown-fg: #b8c2d1;
  --unknown-bg: #1d222b;
  --unknown-bd: #3a4352;
  --proven-fg: #8fc2ee;
  --proven-bg: #152331;
  --proven-bd: #2c4b68;
  --refuted-fg: #c9b0ec;
  --refuted-bg: #241c31;
  --refuted-bd: #4d3a6b;
  --undetermined-fg: #e8c477;
  --undetermined-bg: #2a2315;
  --undetermined-bd: #5c4a24;
  --unproven-fg: #b8c2d1;
  --unproven-bg: #1d222b;
  --unproven-bd: #3a4352;
  --closed-fg: #8bd6a9;
  --closed-bg: #17271e;
  --closed-bd: #2e5a41;
  --partial-fg: #e8c477;
  --partial-bg: #2a2315;
  --partial-bd: #5c4a24;
  --open-fg: #f09a92;
  --open-bg: #2b1917;
  --open-bd: #5f302b;
  --neutral-fg: #b8c2d1;
  --neutral-bg: #1d222b;
  --neutral-bd: #3a4352;
  --warn-fg: #e8c477;
  --warn-bg: #2a2315;
  --warn-bd: #5c4a24;
  --danger-fg: #f09a92;
  --danger-bg: #2b1917;
  --danger-bd: #5f302b;
  --info-fg: #8fc2ee;
  --info-bg: #152331;
  --info-bd: #2c4b68;
}

* { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  scroll-padding-top: calc(var(--topbar-h) + 20px);
}

body {
  margin: 0;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 12% -10%, var(--surface-2) 0, transparent 42rem),
    var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.62;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

[hidden] { display: none !important; }

::selection { background: var(--gold-soft); color: #fffdf8; }

a { color: var(--gold); text-decoration-thickness: 1px; text-underline-offset: 2px; }
a:hover { color: var(--ink); }

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
  border-radius: 3px;
}

.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}

.skip-link {
  position: fixed;
  top: 10px; left: 10px;
  z-index: 200;
  padding: 10px 14px;
  background: var(--ink);
  color: var(--bg);
  border-radius: 8px;
  transform: translateY(-160%);
  transition: transform 0.15s ease;
}
.skip-link:focus { transform: none; }

/* ---------- top bar ---------- */

.topbar {
  position: sticky;
  top: 0;
  z-index: 80;
  min-height: var(--topbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px clamp(14px, 3vw, 28px);
  background: var(--topbar-bg);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.topbar__main { display: flex; align-items: center; gap: 18px; min-width: 0; }

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
  flex-shrink: 0;
}
.brand__mark {
  width: 34px; height: 34px;
  display: inline-grid; place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--gold);
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1;
  box-shadow: inset 0 0 0 3px var(--surface-2);
}
.brand__text {
  display: flex; flex-direction: column;
  font-family: var(--font-serif);
  font-size: 0.98rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}
.brand__text small {
  font-family: var(--font-sans);
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 3px;
}

.topbar__case {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-left: 18px;
  border-left: 1px solid var(--line);
}
.topbar__case-id {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.topbar__case-title {
  max-width: 46ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.topbar__controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; min-width: 0; }

.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.segmented button {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 5px 13px;
  border-radius: 7px;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.segmented button[aria-pressed="true"] {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-soft);
}
.segmented button:hover { color: var(--ink); }

.icon-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 5px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}
.icon-btn:hover { border-color: var(--line-strong); color: var(--ink); }
.icon-btn[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }

#nav-toggle { display: none; }

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

/* ---------- layout / sidebar ---------- */

.layout {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  max-width: 1460px;
  margin: 0 auto;
}

.sidebar {
  position: sticky;
  top: var(--topbar-h);
  height: calc(100vh - var(--topbar-h));
  overflow: auto;
  padding: 26px 16px 40px;
  border-right: 1px solid var(--line);
  scrollbar-width: thin;
}

.sidebar__label {
  margin: 0 0 12px 10px;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.nav-link {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 10px;
  margin: 1px 0;
  border-radius: 8px;
  color: var(--ink-soft);
  text-decoration: none;
  font-size: 0.86rem;
  line-height: 1.35;
}
.nav-link__num {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  color: var(--muted);
  min-width: 1.7em;
}
.nav-link:hover { background: var(--surface-2); color: var(--ink); }
.nav-link.is-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: inset 3px 0 0 var(--gold), var(--shadow-soft);
}
.nav-link.is-active .nav-link__num { color: var(--gold); }


main {
  min-width: 0;
  padding: 40px clamp(20px, 5vw, 68px) 96px;
}

.section {
  scroll-margin-top: calc(var(--topbar-h) + 24px);
  margin: 0 0 72px;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
}
.section-header h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(1.55rem, 2.6vw, 2.15rem);
  line-height: 1.12;
  letter-spacing: -0.01em;
}
.section-kicker {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-sans);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}
.section-header__note { max-width: 52ch; margin: 0; color: var(--muted); font-size: 0.82rem; }

/* ---------- hero ---------- */

.hero { margin-bottom: 64px; }

.hero__kicker {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hero__case-id {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--gold);
}

.hero h1 {
  margin: 0 0 16px;
  max-width: 24ch;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(2.05rem, 4.6vw, 3.5rem);
  line-height: 1.04;
  letter-spacing: -0.025em;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0 0 28px;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 0.82rem;
}
.hero__meta li { display: inline-flex; align-items: baseline; gap: 6px; }
.hero__meta strong { color: var(--ink-soft); font-weight: 600; }

.hero__verdict { margin: 0 0 26px; }

.hero__statusline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.hero__version {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.hero__decision-missing {
  max-width: 70ch;
  margin: 0 0 22px;
  color: var(--muted);
  font-size: 0.86rem;
}

.decision {
  position: relative;
  margin: 0 0 18px;
  padding: 20px 22px 20px 26px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 4px solid var(--gold);
  border-radius: 4px 14px 14px 4px;
  box-shadow: var(--shadow-soft);
}
.decision__label {
  margin: 0 0 6px;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}
.decision__text {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.08rem, 1.8vw, 1.3rem);
  line-height: 1.5;
  color: var(--ink);
}


.hero__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.summary-card {
  --tone: var(--neutral-fg);
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px 18px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.summary-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--tone);
}
.summary-card--merit { --tone: var(--approve-fg); }
.summary-card--defect { --tone: var(--danger-fg); }
.summary-card--action { --tone: var(--gold); }

.summary-card h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 4px 0 6px;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tone);
}
.summary-card__count {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0;
}
.summary-card__hint { margin: 0 0 10px; color: var(--muted); font-size: 0.76rem; line-height: 1.4; }
.summary-card ol { list-style: none; margin: 0; padding: 0; flex: 1; }
.summary-card li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  padding: 10px 0;
  border-top: 1px dashed var(--line);
  font-size: 0.88rem;
  line-height: 1.45;
}
.summary-card li:first-child { border-top: 0; padding-top: 2px; }
.mini-id {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface-2);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  white-space: nowrap;
}
.summary-card__more {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 0.76rem;
}
.summary-card__empty { margin: 0; color: var(--muted); font-size: 0.82rem; }
.summary-card__body { color: var(--muted); font-size: 0.8rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px; }
.summary-card__status { grid-column: 2; justify-self: start; margin-top: 3px; font-size: 0.62rem; }

.hero__method {
  margin: 18px 0 0;
  max-width: 90ch;
  padding: 12px 14px;
  border: 1px dashed var(--line-strong);
  border-radius: 10px;
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

/* ---------- badges and chips ---------- */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--neutral-bd);
  border-radius: 999px;
  background: var(--neutral-bg);
  color: var(--neutral-fg);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
}
.badge::before {
  content: "";
  width: 7px; height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.badge--approve { border-color: var(--approve-bd); background: var(--approve-bg); color: var(--approve-fg); }
.badge--conditions { border-color: var(--conditions-bd); background: var(--conditions-bg); color: var(--conditions-fg); }
.badge--reject { border-color: var(--reject-bd); background: var(--reject-bg); color: var(--reject-fg); }
.badge--insufficient { border-color: var(--insufficient-bd); background: var(--insufficient-bg); color: var(--insufficient-fg); }
.badge--unknown { border-color: var(--unknown-bd); background: var(--unknown-bg); color: var(--unknown-fg); }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid var(--neutral-bd);
  border-radius: 6px;
  background: var(--neutral-bg);
  color: var(--neutral-fg);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
}
.chip--proven { border-color: var(--proven-bd); background: var(--proven-bg); color: var(--proven-fg); }
.chip--refuted { border-color: var(--refuted-bd); background: var(--refuted-bg); color: var(--refuted-fg); }
.chip--undetermined { border-color: var(--undetermined-bd); background: var(--undetermined-bg); color: var(--undetermined-fg); }
.chip--unproven { border-color: var(--unproven-bd); background: var(--unproven-bg); color: var(--unproven-fg); }
.chip--closed { border-color: var(--closed-bd); background: var(--closed-bg); color: var(--closed-fg); }
.chip--partial { border-color: var(--partial-bd); background: var(--partial-bg); color: var(--partial-fg); }
.chip--open { border-color: var(--open-bd); background: var(--open-bg); color: var(--open-fg); }
.chip--neutral { border-color: var(--neutral-bd); background: var(--neutral-bg); color: var(--neutral-fg); }
.chip--warn { border-color: var(--warn-bd); background: var(--warn-bg); color: var(--warn-fg); }

.id-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 1px 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface-2);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}
.id-chip:hover { border-color: var(--gold); color: var(--ink); }

.muted { color: var(--muted); }
.small { font-size: 0.8rem; }
.nowrap { white-space: nowrap; }

/* ---------- notices ---------- */

.notice {
  display: flex;
  gap: 12px;
  margin: 16px 0;
  padding: 13px 15px;
  border: 1px solid var(--info-bd);
  border-left: 4px solid var(--info-fg);
  border-radius: 10px;
  background: var(--info-bg);
  color: var(--ink-soft);
  font-size: 0.86rem;
  line-height: 1.5;
}
.notice--warning { border-color: var(--warn-bd); border-left-color: var(--warn-fg); background: var(--warn-bg); }
.notice--danger { border-color: var(--danger-bd); border-left-color: var(--danger-fg); background: var(--danger-bg); }
.notice--success { border-color: var(--approve-bd); border-left-color: var(--approve-fg); background: var(--approve-bg); }
.notice__icon {
  flex-shrink: 0;
  width: 22px; height: 22px;
  display: inline-grid; place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: var(--font-serif);
  font-size: 0.78rem;
}
.notice p { margin: 0; }
.notice p + p { margin-top: 6px; }

.callout {
  margin: 18px 0;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}
.callout--recommendation {
  border-color: var(--gold-soft);
  background: linear-gradient(180deg, var(--surface) 0, var(--surface-2) 100%);
  box-shadow: inset 0 4px 0 var(--gold), var(--shadow);
}
.callout h3 { margin: 0 0 8px; font-family: var(--font-serif); font-size: 1.25rem; }
.callout h4 { margin: 0 0 8px; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.callout p:last-child { margin-bottom: 0; }

/* ---------- version panels ---------- */

.version-panel { margin: 0; }
.version-panel + .version-panel { margin-top: 34px; }
.version-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 4px;
  font-family: var(--font-serif);
  font-size: 1.45rem;
  font-weight: 600;
}
.version-lead { margin: 0 0 18px; color: var(--muted); font-size: 0.84rem; }

.count-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 24px;
}
.count-strip .chip { font-size: 0.72rem; padding: 5px 9px; }

.verdict-block {
  margin: 0 0 30px;
  scroll-margin-top: calc(var(--topbar-h) + 20px);
}
.verdict-block > h4 {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-serif);
  font-size: 1.22rem;
  font-weight: 600;
}
.verdict-block .prose > :first-child { margin-top: 0; }

.prose { color: var(--ink-soft); }
.prose p { margin: 0 0 13px; }
.prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
  font-family: var(--font-serif);
  color: var(--ink);
  line-height: 1.25;
  margin: 24px 0 10px;
}
.prose h4 { font-size: 1.08rem; }
.prose h5 { font-size: 0.98rem; }
.prose h6 { font-size: 0.82rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.prose ul, .prose ol { margin: 0 0 14px; padding-left: 1.4em; }
.prose li { margin: 4px 0; }
.prose li > ul, .prose li > ol { margin: 4px 0 6px; }
.prose blockquote {
  margin: 14px 0;
  padding: 10px 16px;
  border-left: 3px solid var(--line-strong);
  background: var(--surface-2);
  border-radius: 0 8px 8px 0;
  color: var(--ink-soft);
}
.prose blockquote > :last-child { margin-bottom: 0; }
.prose code {
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.prose pre {
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  line-height: 1.5;
}
.prose pre code { padding: 0; border: 0; background: transparent; font-size: 0.82rem; }
.prose hr { border: 0; border-top: 1px solid var(--line); margin: 22px 0; }
.prose strong { color: var(--ink); }
.prose .md-image {
  display: inline-block;
  padding: 1px 6px;
  border: 1px dashed var(--line-strong);
  border-radius: 4px;
  color: var(--muted);
  font-size: 0.8rem;
}
.file-ref {
  font-family: var(--font-mono);
  font-size: 0.86em;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--gold);
  text-decoration: none;
}
.file-ref--missing {
  border-style: dashed;
  color: var(--danger-fg);
  background: var(--danger-bg);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

/* ---------- tables ---------- */

.table-wrap {
  margin: 16px 0;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  -webkit-overflow-scrolling: touch;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  line-height: 1.5;
}
th {
  padding: 10px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-align: left;
  text-transform: uppercase;
  vertical-align: bottom;
  white-space: nowrap;
}
td {
  padding: 11px 12px;
  border-top: 1px solid var(--line);
  vertical-align: top;
}
tbody tr:first-child td { border-top: 0; }
tbody tr:hover { background: var(--surface-2); }
td .chip { white-space: normal; }
table a { overflow-wrap: anywhere; }

.thesis-table { min-width: 780px; }
.thesis-table td:nth-child(1) { width: 78px; }
.thesis-table td:nth-child(3) { width: 150px; }
.thesis-table .cell-basis { color: var(--muted); font-size: 0.84rem; }
.thesis-table tr:target { background: var(--conditions-bg); outline: 2px solid var(--gold-soft); outline-offset: -2px; }

.recon-table { min-width: 860px; }
.recon-table td:nth-child(1) { width: 78px; }
.recon-table td:nth-child(4) { width: 130px; }

.phases-table { min-width: 620px; }
.sources-table { min-width: 720px; }
.checks-table { min-width: 640px; }
.checks-table td:first-child { font-family: var(--font-mono); font-size: 0.78rem; }
.checks-table tr.is-failed { background: var(--danger-bg); }

.cell-ok { color: var(--approve-fg); font-weight: 700; }
.cell-fail { color: var(--danger-fg); font-weight: 700; }

/* ---------- filters ---------- */

.filterbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 12px 0 8px;
}
.filter-btn {
  appearance: none;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
}
.filter-btn:hover { border-color: var(--line-strong); color: var(--ink); }
.filter-btn[aria-pressed="true"] {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}
.filter-btn .count { opacity: 0.7; margin-left: 4px; font-family: var(--font-mono); font-size: 0.68rem; }
.filter-search { margin-left: auto; min-width: 190px; flex: 1 1 190px; }
.filter-search input {
  width: 100%;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.8rem;
}
.filter-search input::placeholder { color: var(--muted); opacity: 0.8; }
.filter-status { margin: 0 0 10px; color: var(--muted); font-size: 0.74rem; min-height: 1.2em; }
.filter-empty { margin: 18px 0; padding: 18px; border: 1px dashed var(--line-strong); border-radius: 10px; color: var(--muted); text-align: center; font-size: 0.86rem; }

/* ---------- accordions ---------- */

details.acc {
  margin: 12px 0;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
details.acc + details.acc { margin-top: 10px; }
details.acc > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 15px 18px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
details.acc > summary::-webkit-details-marker { display: none; }
details.acc > summary:hover { background: var(--surface-2); }
details.acc[open] > summary {
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
}
.acc__badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}
.acc__badge--prosecution { border-color: var(--danger-bd); background: var(--danger-bg); color: var(--danger-fg); }
.acc__badge--defense { border-color: var(--proven-bd); background: var(--proven-bg); color: var(--proven-fg); }
.acc__title {
  font-family: var(--font-serif);
  font-size: 1.08rem;
  color: var(--ink);
  line-height: 1.3;
}
.acc__meta {
  margin-left: auto;
  color: var(--muted);
  font-size: 0.72rem;
  white-space: nowrap;
}
.acc__chevron {
  width: 18px; height: 18px;
  display: inline-grid; place-items: center;
  color: var(--muted);
  transition: transform 0.18s ease;
  flex-shrink: 0;
}
.acc__chevron::before { content: "▾"; font-size: 0.9rem; line-height: 1; }
details.acc[open] .acc__chevron { transform: rotate(180deg); }
.acc__body { padding: 18px 20px 20px; }
.acc__body > :first-child { margin-top: 0; }
.acc__link {
  margin: 16px 0 0;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
  color: var(--muted);
  font-size: 0.8rem;
}
details.acc--secondary { border-style: dashed; box-shadow: none; }
details.acc--secondary > summary { padding: 12px 16px; }
details.acc--secondary .acc__title { font-family: var(--font-sans); font-size: 0.86rem; font-weight: 700; }

/* ---------- ID grid / judge decisions ---------- */

.judge-decisions {
  margin: 30px 0 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}
.judge-decisions h4 { margin: 0 0 4px; font-family: var(--font-serif); font-size: 1.2rem; }

/* ---------- evidence ---------- */

.evidence-legend {
  max-width: 86ch;
  margin: -4px 0 18px;
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.5;
}
.evidence-context { margin: 26px 0 0; }
.evidence-group { margin: 26px 0 0; }.evidence-group h4 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-size: 1.24rem;
}
.evidence-group h4 .muted { font-family: var(--font-sans); font-size: 0.76rem; }
.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.evidence-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}
.evidence-card__head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 10px; }
.evidence-card__claim { margin: 0 0 12px; color: var(--ink); font-size: 0.9rem; line-height: 1.5; flex: 1; }
.evidence-card__meta { margin: 0; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 0.78rem; }
.evidence-card__meta div { display: grid; grid-template-columns: 6.8em minmax(0, 1fr); gap: 8px; padding: 3px 0; }
.evidence-card__meta dt { color: var(--muted); font-size: 0.7rem; letter-spacing: 0.04em; text-transform: uppercase; }
.evidence-card__meta dd { margin: 0; color: var(--ink-soft); overflow-wrap: anywhere; }
.chip--type { font-family: var(--font-mono); letter-spacing: 0.02em; }
.chip--type-m { border-color: var(--proven-bd); background: var(--proven-bg); color: var(--proven-fg); }
.chip--type-w { border-color: var(--info-bd); background: var(--info-bg); color: var(--info-fg); }
.chip--type-c { border-color: var(--closed-bd); background: var(--closed-bg); color: var(--closed-fg); }
.chip--type-a { border-color: var(--warn-bd); background: var(--warn-bg); color: var(--warn-fg); }

.assumption-list { list-style: none; margin: 12px 0 0; padding: 0; }
.assumption-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  border-top: 1px dashed var(--line);
  font-size: 0.88rem;
  line-height: 1.5;
}
.assumption-list li:first-child { border-top: 0; }
.assumption-list .mini-id { align-self: start; margin-top: 2px; }

/* ---------- reconstruction / comparison ---------- */

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 0 0 22px;
}
.stat {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}
.stat__label { display: block; margin-bottom: 4px; color: var(--muted); font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase; }
.stat__value { font-family: var(--font-serif); font-size: 1.08rem; line-height: 1.3; }
.stat__value small { display: block; font-family: var(--font-sans); font-size: 0.72rem; color: var(--muted); margin-top: 3px; }


.compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  margin: 0 0 20px;
}
.compare-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}
.compare-card__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.compare-card__head h3 { margin: 0; font-family: var(--font-serif); font-size: 1.3rem; }

/* ---------- procedure ---------- */

.warnings { margin: 0 0 24px; padding: 0; list-style: none; }
.warnings li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px 12px;
  margin: 6px 0;
  border: 1px solid var(--warn-bd);
  border-radius: 9px;
  background: var(--warn-bg);
  color: var(--ink-soft);
  font-size: 0.84rem;
}
.warnings li[data-severity="info"] { border-color: var(--info-bd); background: var(--info-bg); }
.warn-mark {
  display: inline-grid;
  place-items: center;
  width: 20px; height: 20px;
  border: 1px solid currentColor;
  border-radius: 50%;
  color: var(--warn-fg);
  font-size: 0.7rem;
  font-weight: 800;
}
.warnings li[data-severity="info"] .warn-mark { color: var(--info-fg); }

.hearing-block { margin: 0 0 24px; }
.hearing-block h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 1.22rem;
}
.verify-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}
.verify-card {
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}
.verify-card h4 { margin: 0 0 6px; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.verify-card__value { display: flex; align-items: baseline; gap: 8px; font-family: var(--font-serif); font-size: 1.32rem; }
.verify-card__value small { font-family: var(--font-sans); font-size: 0.76rem; color: var(--muted); }
.verify-card p { margin: 8px 0 0; color: var(--muted); font-size: 0.8rem; }

.timeline { margin: 0; padding: 0; list-style: none; }
.timeline li {
  position: relative;
  padding: 0 0 14px 22px;
  border-left: 2px solid var(--line);
  margin-left: 6px;
  font-size: 0.86rem;
}
.timeline li::before {
  content: "";
  position: absolute;
  left: -6px; top: 6px;
  width: 10px; height: 10px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 0 2px var(--gold);
}
.timeline li:last-child { border-left-color: transparent; padding-bottom: 0; }
.timeline strong { color: var(--ink); }

.generator-note {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.55;
}
.generator-note p { margin: 0 0 8px; }
.generator-note p:last-child { margin-bottom: 0; }
.generator-note code { font-family: var(--font-mono); font-size: 0.9em; color: var(--ink-soft); }

footer {
  margin-top: 40px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.76rem;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

/* ---------- to top ---------- */

#to-top {
  position: fixed;
  right: 20px; bottom: 22px;
  z-index: 70;
  width: 42px; height: 42px;
  display: inline-grid; place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
  font-size: 1rem;
  cursor: pointer;
}
#to-top:hover { background: var(--surface-2); }

/* ---------- version visibility ---------- */

body[data-version="1"] [data-hearing="2"] { display: none !important; }
body[data-version="2"] [data-hearing="1"] { display: none !important; }

/* ---------- conditions / reconciliation digest ---------- */

.condition-list { display: grid; gap: 12px; }
.condition-card {
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}
.condition-card > header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.condition-card h5 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.06rem;
  font-weight: 600;
}
.condition-card .prose { font-size: 0.92rem; }


.section > h3 {
  margin: 32px 0 12px;
  font-family: var(--font-serif);
  font-size: 1.32rem;
  font-weight: 600;
  line-height: 1.25;
}
.section > h3:first-of-type { margin-top: 22px; }


@media (max-width: 1100px) {
  body.nav-open { overflow: hidden; }
}

/* ---------- responsive ---------- */

@media (max-width: 1100px) {
  .layout { display: block; }
  .sidebar {
    position: fixed;
    top: var(--topbar-h);
    left: 0;
    bottom: 0;
    z-index: 90;
    width: min(330px, 88vw);
    height: calc(100vh - var(--topbar-h));
    padding: 22px 18px 24px;
    background: var(--bg);
    border-right: 1px solid var(--line);
    box-shadow: var(--shadow);
    transform: translateX(-105%);
    transition: transform 0.2s ease;
  }
  .sidebar.is-open { transform: none; }
  #nav-toggle { display: inline-flex; }
  main { padding: 30px 20px 80px; }
  .topbar__case { display: none; }
}

@media (max-width: 720px) {
  :root { --topbar-h: 104px; }
  .topbar {
    display: block;
    padding: 10px 14px 9px;
  }
  .topbar__main {
    width: 100%;
    justify-content: space-between;
    margin-bottom: 9px;
  }
  .topbar__controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    overflow: visible;
  }
  .topbar__controls .icon-btn { justify-content: center; padding: 5px 10px; font-size: 0.72rem; }
  .segmented button { padding: 5px 10px; }
  .hero h1 { max-width: none; overflow-wrap: break-word; }
  .hero__cards { grid-template-columns: 1fr; }
  .section { margin-bottom: 52px; }
  .section-header { align-items: flex-start; }
  .filter-search { margin-left: 0; flex-basis: 100%; }
  .acc__meta { width: 100%; margin-left: 0; order: 4; }
  #to-top { right: 14px; bottom: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
`
