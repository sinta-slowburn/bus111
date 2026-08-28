# CROWDCON - Singapore Day-Trip & Crowd Risk Intelligence Application
## Master Prompt & System Architecture Specification

---

### 1. Role & Engineering Profile
- **Role:** Senior Front-End Developer & Product Engineer.
- **Specialisation:**
  - Vanilla JavaScript (ES6+) with zero framework dependencies.
  - Semantic, accessible HTML5 with WCAG 2.1 AA compliance.
  - Responsive mobile-first UI development in Neo-Brutalism ("Electric Grit") design system.
  - Material Design & brutalist ergonomics with 4px/8px borders, hard shadows, and high contrast.
  - Vercel Serverless Functions (`api/insight.js`) and Express runtime compatibility.
  - Secure API integration with Google Gemini server-side processing (`@google/genai`).
  - Singapore location, transport (MRT/Bus/Taxi/Walk), NEA localized weather nowcasting, and crowd risk telemetry.

---

### 2. Product Objectives
1. **Avoid Crowded Places:** Identify platform overcrowding, gantry bottlenecks, and venue surges across Singapore nodes.
2. **Discover Tranquil Alternatives:** Recommend lower visitor pressure green nodes (e.g. Singapore Botanic Gardens, Jurong Lake Gardens, Gillman Barracks) when central shopping corridors (Orchard Road, Dhoby Ghaut, Marina Bay) surge.
3. **Transport Mode Optimization:** Compare MRT (underground/sheltered), Public Bus (surface/scenic), Taxi/Grab (surge pricing in rain), and Walking.
4. **Localized Weather Integration:** Couple NEA 2-hour localized rainfall nowcasts with indoor/outdoor crowd sheltering behaviors.

---

### 3. Data Truthfulness & Integrity Directives
- **Zero Hallucination of Absolute Headcounts:** Never display unverified absolute crowd numbers (e.g. "3,400 people on platform").
- **Relative Indices:** Express crowd pressure using relative indices: `Crowd Index: 1/5` to `5/5`, or categories `Quiet`, `Low`, `Moderate`, `Busy`, `High`, `Very busy`, `Forecast`, `Estimated`.
- **Telemetry Separation:**
  - **MRT crowd density** = Platform dwell and concourse sensor telemetry.
  - **Venue footfall** = Relative venue activity index.
  - **Traffic conditions** = Road congestion indices.
  - **Weather** = NEA regional reporting station readings.
- **Provenance & Timestamping:** All data cards explicitly label data source (`LTA DataMall`, `NEA Weather API`, `NParks`) and freshness (`Live Telemetry`, `Just now`).

---

### 4. File Structure & Delivery Manifest
1. `index.html`: Complete, accessible HTML5 semantic structure with skip links, ARIA live region, Material Symbols Outlined, Syne & Archivo Narrow typography, Leaflet CSS/JS, and Chart.js.
2. `styles.css`: Mobile-first Neo-Brutalist Electric Grit stylesheet with custom CSS variables, hard 4px/8px black borders, hard box shadows, responsive breakpoints (768px, 1024px), focus states, and reduced-motion support.
3. `app.js`: Vanilla JavaScript application logic with clear, beginner-friendly documentation on every function, Leaflet Singapore map integration, interactive bento dashboard, stepped chart visualization, live search filter, and quick action protocols.
4. `api/insight.js`: Vercel serverless function & Express route handler for Gemini-powered day trip recommendations and transport comparisons with input validation and secure server-side key handling.
5. `masterprompt.md`: This comprehensive reference manual.

---

### 5. Environment Variables
```env
# .env.example
GEMINI_API_KEY=
```
- **Security Rule:** `GEMINI_API_KEY` is strictly accessed in server-side backend logic (`api/insight.js` / `server.ts`) and is NEVER exposed to the browser client or client storage.

---

### 6. Deployment & Start Commands
- **Dev Server:** `npm run dev` (Boots Express + Vite on port 3000)
- **Production Build:** `npm run build`
- **Production Start:** `npm start` (Runs `node dist/server.cjs`)
