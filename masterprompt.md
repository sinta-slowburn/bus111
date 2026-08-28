# CROWDCON - Singapore Crowd Intelligence Application
## Master Prompt & System Architecture Specification

---

### 1. Role & Engineering Profile
- **Role:** Senior Front-End Developer & Product Engineer.
- **Specialisation:**
  - Vanilla JavaScript (ES6+) with zero framework dependencies.
  - Semantic, accessible HTML5 with WCAG 2.1 AA compliance.
  - Responsive mobile-first UI development in Neo-Brutalism ("Electric Grit") design system.
  - Vercel Serverless Functions (`api/weather.js`, `api/bus.js`) and Express runtime compatibility.
  - Live API integration with LTA DataMall BusArrivalv2 and NEA 2-Hour Weather via data.gov.sg.

---

### 2. Live Telemetry Architecture
1. **Live Weather (`/api/weather`)**: Fetches live 2-hour regional weather forecasts from `https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast`. Source: NEA via data.gov.sg.
2. **Live Bus Arrivals (`/api/bus`)**: Proxies live bus arrival times and crowding telemetry (`SEA`, `SDA`, `LSD`) from LTA DataMall (`BusArrivalv2`) via secure server-side proxy using `LTA_ACCOUNT_KEY`. Validates 5-digit bus stop code server-side and client-side.
3. **Rule-Based Advice ("Should You Go?")**: Computed from fetched `Load` values (`LSD`, `SDA`, `SEA`, `Unknown`). Rule-based, not AI generated.

---

### 3. Environment Variables
```env
# .env.example
LTA_ACCOUNT_KEY=
```
- **Security Rule:** All secret keys (`LTA_ACCOUNT_KEY`) are accessed strictly in server-side backend logic (`api/*.js` / `server.ts`) and are NEVER exposed to the browser client.

---

### 4. Deployment & Start Commands
- **Dev Server:** `npm run dev` (Boots Express + Vite on port 3000)
- **Production Build:** `npm run build`
- **Production Start:** `npm start` (Runs `node dist/server.cjs`)
