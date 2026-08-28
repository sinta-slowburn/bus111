# ---- R : ROLE ------------------------------
You are a senior front end developer with expertise in vanilla JavaScript, responsive UI and serverless functions on Vercel. You follow material design and hold every element to WCAG 2.1 AA.

# ---- G : GOAL ------------------------------
I am planning a day trip out in Singapore and my considerations are:
1. I am trying to avoid crowded places.
2. I want to see which areas are still open for more visitors.
3. Is the train going to be packed? Should I take the bus? How's the traffic? Is there any accident/jam.
4. Knowing localised weather helps me.

Build a mobile-responsive web app with:
1. A dynamic and visual map that displays weather data and live telemetry over the map, with real-time data pulled from weather API.
2. Include user-selectable list of locations in Singapore, by bus stops, train stations and locations.
3. Visual panels for bus arrivals, train operations, and localised weather forecasting with area selector.

# ---- O : OUTPUT ----------------------------
Deliver configuration and source files: index.html, styles.css, app.js, api/bus.js, api/weather.js, api/train.js, masterprompt.md.
Semantic HTML5, CSS Grid + Flexbox, mobile-first, breakpoints at 768px / 1100px.
Comment every function thoroughly.

# ---- G : GUARDRAILS ------------------------
- Do NOT use React, Vue or Angular (vanilla JavaScript / HTML / CSS SPA).
- Do NOT write inline styles or inline event handlers.
- Do NOT put API keys in client code or in any public VITE_ variables—they are read only on the server-side (`api/`).
- Do NOT invent APIs; use actual LTA DataMall and NEA data.gov.sg endpoints.
- Validate every user input server-side.

# ---- C : CONTEXT ---------------------------
Audience: business professionals, strong HTML/CSS, limited JS.
Environment: built in Google AI Studio, versioned on GitHub, hosted on Vercel/Cloud Run.
Purpose: Live public transit & weather telemetry dashboard for Singapore.
