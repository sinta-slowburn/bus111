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
  const line = (urlObj.searchParams.get("line") || "").trim().toUpperCase();

  const allowedLines = ["CCL", "CEL", "CGL", "DTL", "EWL", "NEL", "NSL", "BPL", "SLRT", "PLRT", "TEL"];
  if (!allowedLines.includes(line)) {
    return res.status(400).json({ success: false, error: "Invalid train line. Must be one of: " + allowedLines.join(", ") });
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY;
  if (!accountKey || accountKey === "MY_LTA_ACCOUNT_KEY") {
    return res.status(500).json({ success: false, error: "LTA_ACCOUNT_KEY is not configured on the server." });
  }

  try {
    const response = await fetch(`https://datamall2.mytransport.sg/ltaodataservice/PCDRealTime?TrainLine=${line}`, {
      headers: {
        "AccountKey": accountKey,
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`LTA DataMall HTTP ${response.status}`);
    }

    const data = await response.json();
    console.error("LTA PCDRealTime raw response keys:", Object.keys(data || {}));

    const valueObj = data.value || data.Value || data || {};
    const stationsRaw = valueObj.Stations || valueObj.stations || data.Stations || data.stations || [];

    const stations = (Array.isArray(stationsRaw) ? stationsRaw : []).map(st => {
      const mapCrowd = (level) => {
        if (!level) return "Unknown";
        const code = String(level).trim();
        if (code === "l" || code === "L") return "Low";
        if (code === "m" || code === "M") return "Moderate";
        if (code === "h" || code === "H") return "High";
        if (code === "NA" || code === "na") return "No data";
        return "Unknown";
      };

      return {
        stationID: st.StationID || st.stationID || st.StnCode || st.stnCode || "",
        stationName: st.StationName || st.stationName || st.StnName || st.stnName || "Unknown Station",
        crowdLevel: mapCrowd(st.CrowdLevel || st.crowdLevel || st.Level || st.level),
      };
    });

    return res.status(200).json({
      success: true,
      line,
      stations,
      source: "LTA DataMall",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/train error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable", detail: error.message });
  }
}
