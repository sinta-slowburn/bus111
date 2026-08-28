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

  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const latParam = urlObj.searchParams.get("lat");
  const lngParam = urlObj.searchParams.get("lng");
  const areaParam = urlObj.searchParams.get("area");

  try {
    const response = await fetch("https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast", {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CROWDCON-App",
      },
    });

    if (!response.ok) {
      throw new Error(`Data.gov.sg HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = data?.data?.items || [];
    const forecasts = items[0]?.forecasts || [];
    const areaMeta = data?.data?.area_metadata || [];
    const areas = areaMeta.map(m => m.name).filter(Boolean);

    if (areaParam !== null && areaParam !== "") {
      if (!areas.includes(areaParam)) {
        return res.status(400).json({ success: false, error: "Invalid area name." });
      }
      const matchedForecast = forecasts.find(f => f.area === areaParam) || { area: areaParam, forecast: "Fair" };
      return res.status(200).json({
        success: true,
        area: matchedForecast.area,
        forecast: matchedForecast.forecast,
        areas,
        source: "NEA via data.gov.sg",
        fetchedAt: new Date().toISOString(),
      });
    }

    if (latParam !== null || lngParam !== null) {
      const targetLat = Number(latParam);
      const targetLng = Number(lngParam);

      if (
        isNaN(targetLat) ||
        isNaN(targetLng) ||
        targetLat < 1.1 ||
        targetLat > 1.5 ||
        targetLng < 103.6 ||
        targetLng > 104.1
      ) {
        return res.status(400).json({ success: false, error: "Invalid latitude or longitude coordinates." });
      }

      let nearestArea = "Singapore";
      let minDistance = Infinity;

      const coordsMap = {};
      areaMeta.forEach(meta => {
        if (meta && meta.name && meta.label_location) {
          coordsMap[meta.name] = {
            lat: meta.label_location.latitude,
            lng: meta.label_location.longitude,
          };
        }
      });

      forecasts.forEach(f => {
        const areaName = f.area;
        const coords = coordsMap[areaName];
        if (coords) {
          const dist = Math.hypot(coords.lat - targetLat, coords.lng - targetLng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestArea = areaName;
          }
        }
      });

      const matchedForecast = forecasts.find(f => f.area === nearestArea) || forecasts[0] || { area: nearestArea, forecast: "Fair" };

      return res.status(200).json({
        success: true,
        area: matchedForecast.area,
        forecast: matchedForecast.forecast,
        areas,
        source: "NEA via data.gov.sg",
        fetchedAt: new Date().toISOString(),
      });
    }

    // Default behavior when no lat/lng or area supplied
    const target = forecasts.find(f => f.area === "City") || forecasts[0] || { area: "City", forecast: "Fair" };

    return res.status(200).json({
      success: true,
      area: target.area,
      forecast: target.forecast,
      areas,
      source: "NEA via data.gov.sg",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/weather error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable: Failed to fetch live weather" });
  }
}
