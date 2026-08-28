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
    const target = forecasts[0] || { area: "Singapore", forecast: "Fair" };

    return res.status(200).json({
      success: true,
      area: target.area,
      forecast: target.forecast,
      source: "NEA via data.gov.sg",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/weather error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable: Failed to fetch live weather" });
  }
}
