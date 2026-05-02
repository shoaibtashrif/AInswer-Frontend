# AInswer.co Portal - Technical Documentation

Welcome to the internal documentation for the **AInswer.co Voice Agent SaaS Portal**. This documentation provides an overview of the frontend architecture, API integration layers, styling methodologies, and critical components of the platform.

---

## 1. Project Overview

The AInswer Portal is a pure, single-page application (SPA) built exclusively with HTML, Vanilla JavaScript, and Vanilla CSS. It avoids heavy compilers or frameworks (like React or Webpack) in favor of lightweight, blazing-fast browser interpretation. 

**Key Objectives:**
- Provide a secure dashboard for clients to monitor AI voice agent calls natively.
- Provide Create, Read, Update, and Delete (CRUD) interfaces for Agent Prompting.
- Connect seamlessly to the central backend (`https://agent.cabex.co.uk/outbound`).

---

## 2. Quick Start (Running Locally)

Since the AInswer portal is a pure HTML/JS application built without a bundler, it is exceptionally easy to spin up. You simply need to serve the directory through a local web server to prevent browser CORS/file-protocol issues.

**Using Node.js (`npx`):**
If you have Node.js installed, open a terminal in the root `/AInswer` directory and run:
\`\`\`bash
npx serve -p 3000 .
\`\`\`

**Using Python:**
If you prefer Python, you can run:
\`\`\`bash
python3 -m http.server 3000
\`\`\`

Once the server is running, open your browser and navigate to \`http://localhost:3000/login.html\` or \`http://localhost:3000/index.html\`.

---

## 3. Architecture & Tech Stack

- **Core Technologies:** HTML5, CSS3, JavaScript (ES6+).
- **Data Visualization:** [Chart.js](https://www.chartjs.org/) exclusively utilized via CDN.
- **State Management:** Uses browser `localStorage` to handle standard persistent session data (Auth Tokens, Role strings) and `sessionStorage` for temporary single-page state (current viewed IDs).
- **DOM Routing Strategy:** Relies on dedicated `.html` files in the `/app` folder representing logical views (e.g., `dashboard.html`, `agents.html`). The core logic is housed centrally in `assets/app.js` to ensure functions are universally available.

### Directory Structure

```text
/AInswer
│
├── index.html              // Landing page layout
├── login.html              // Authentication screen
├── pricing.html            // Marketing tier layout
│
├── app/                    // Core Application/Dashboard Routes
│   ├── dashboard.html      // Primary KPI & Chart views
│   ├── agents.html         // Manage Agents UI (List, Create, Edit)
│   ├── calls.html          // Call History & Pagination table
│   ├── call-detail.html    // Individual comprehensive Call view & transcript
│   ├── go-live.html        // Testing and routing implementation
│   ├── settings.html       // General profile/app settings
│   └── integrations.html   // Third-party SaaS API connections
│
└── assets/                 
    ├── app.js              // Global API fetchers, DOM renderers, Auth State
    └── styles.css          // Design system, layout rules, and color palettes
```

---

## 3. Data Flow & API Integrations

All API interaction passes securely through the generalized configuration managed at the top of `app.js`.

**Base URI:** `https://agent.cabex.co.uk/outbound`

### Authentication
Authentication relies on the `/api/login` and `/api/register` endpoints.
- Tokens return as JWT strings and are stored under the key `ainswer_token` in `localStorage`.
- All secured requests execute with customized fetch headers:
  `Authorization: Bearer <token>`
- If a route identifies a missing token via `requireAuth()`, the portal immediately redirects to `login.html`.

### Agent Management (`app/agents.html`)
The Agent environment drives custom prompt creation, voice selections, and settings.
- **`GET /api/agents`:** Populates the master list.
- **`GET /api/voices`:** Dynamically builds drop-downs required for Agent profiles. It includes flags/labels, text descriptions, and an audio `<audio>` preview element generated entirely dynamically through JavaScript arrays matching `voiceId`.
- **`POST /api/agents`:** Used to generate new Agent setups with parsed JSON mapping.
- **`PUT /api/agents/{id}`:** Executed dynamically when users select an active row to adjust prompts or Google-webhook specifics.

### Call Logs & History (`app/calls.html`)
Handles heavy metric loads.
- **`GET /api/history`:** Automatically supports pagination via URL queries (ex: `limit=15&page=1`). The script handles HTML-button logic explicitly relying on API metadata `pagination.has_next`.
- **`GET /api/calls/{callId}`:** To prevent frequent CORS preflight violations (HTTP `OPTIONS`), a dual-fetch safety net is implemented. It will first attempt with an `Authorization` header, and if blocked seamlessly execute a fallback simple request to procure the data.

---

## 4. UI/UX and Styling Mechanisms

The portal utilizes a rigorous **CSS Variables Design System** localized within `/assets/styles.css`.

- **Layout Grid Base:** Elements span flexibly on a core `<section class="layout">` container restricted to a responsive `95%` maximum width.
- **Radial Backdrops:** Uses sophisticated stacked `radial-gradient` settings attached permanently on the specific body tags, preventing clipping failures under scroll conditions.
- **Cards & Paneling:** Component blocks utilize standard `.card`, `.padded`, `.grid-2`, and `.grid-3` utility classes. 

### Core CSS Variables

```css
:root {
  --bg: #f7f8fc;
  --panel: #ffffff;
  --text: #0b1220;
  --muted: #5b6475;
  --accent: #635bff;    /* UI Highlight Blue */
  --accent2: #00d4ff;   /* Graded Cyan Contrast */
  --max: 95%;           /* Adaptive Full Width Framework */
  --radius: 16px;       /* Native Shape Softening */
}
```

### Micro-Components
- **Clickable Rows:** The table logic adds a native hover action over rows leveraging `class="clickable-row"` handling JS event-propagation prevention for inline child elements like a copy-clipboard button.
- **Transcripts Container:** Bounced to a restricted `.transcript-box` `max-height: 400px` structure preventing endless scrolls on high depth multi-minute logs. 

---

## 5. Adding New Features

Follow these steps when expanding the platform:
1. **API Definitions:** Declare any new asynchronous fetch functions globally in `assets/app.js`. Ensure you include fallback/catch `try{...} catch(e){...}` exception blocking.
2. **Expose Context:** Export new logic variables to `window.AInswer` right at the bottom of the `.js` file to ensure the application logic acts globally across DOM documents.
3. **Template Routing:** Construct your HTML layout extending standard `.container` rules. Bind `<script>` tags at the bottom to trigger specific logic upon the page loading (e.g. `AInswer.renderNewFeature('targetDiv');`).
