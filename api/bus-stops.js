let cachedBusStops = null;
let cachedAt = 0;
let inFlightFetch = null;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
const MAX_PAGES = 30;

function normalizeBusStop(stop) {
  return {
    code: String(stop.BusStopCode || stop.code || ""),
    name: String(stop.Description || stop.name || ""),
    road: String(stop.RoadName || stop.road || ""),
    lat: Number(stop.Latitude ?? stop.lat),
    lng: Number(stop.Longitude ?? stop.lng),
  };
}

async function fetchAllBusStops(accountKey) {
  const now = Date.now();
  if (cachedBusStops && now - cachedAt < CACHE_TTL_MS) {
    return cachedBusStops;
  }

  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    const stops = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const skip = page * PAGE_SIZE;
      const response = await fetch(`https://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip=${skip}`, {
        headers: {
          "AccountKey": accountKey,
          "accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`LTA DataMall HTTP ${response.status}`);
      }

      const data = await response.json();
      const pageStops = Array.isArray(data.value) ? data.value.map(normalizeBusStop) : [];
      stops.push(...pageStops);

      if (pageStops.length < PAGE_SIZE) {
        break;
      }
    }

    cachedBusStops = stops.filter(stop =>
      /^\d{5}$/.test(stop.code) &&
      stop.name &&
      stop.road &&
      !Number.isNaN(stop.lat) &&
      !Number.isNaN(stop.lng)
    );
    cachedAt = Date.now();
    return cachedBusStops;
  })();

  try {
    return await inFlightFetch;
  } finally {
    inFlightFetch = null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY;
  if (!accountKey || accountKey === "MY_LTA_ACCOUNT_KEY") {
    return res.status(500).json({ success: false, error: "LTA_ACCOUNT_KEY is not configured on the server." });
  }

  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const code = urlObj.searchParams.get("code");
    const search = (urlObj.searchParams.get("search") || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(urlObj.searchParams.get("limit")) || 20, 1), 100);
    const busStops = await fetchAllBusStops(accountKey);

    if (code) {
      const matchedStop = busStops.find(stop => stop.code === code);
      if (!matchedStop) {
        return res.status(404).json({ success: false, error: "Bus stop not found." });
      }
      return res.status(200).json({
        success: true,
        busStop: matchedStop,
        source: "LTA DataMall",
        fetchedAt: new Date().toISOString(),
      });
    }

    const filteredStops = search
      ? busStops.filter(stop =>
          stop.code.includes(search) ||
          stop.name.toLowerCase().includes(search) ||
          stop.road.toLowerCase().includes(search)
        ).slice(0, limit)
      : busStops;

    return res.status(200).json({
      success: true,
      busStops: filteredStops,
      count: filteredStops.length,
      source: "LTA DataMall",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/bus-stops error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable" });
  }
}
