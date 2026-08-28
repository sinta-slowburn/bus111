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
  const stop = urlObj.searchParams.get("stop") || "";

  if (!/^\d{5}$/.test(stop)) {
    return res.status(400).json({ success: false, error: "Invalid bus stop code. Must be exactly 5 digits." });
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY;
  if (!accountKey || accountKey === "MY_LTA_ACCOUNT_KEY") {
    return res.status(500).json({ success: false, error: "LTA_ACCOUNT_KEY is not configured on the server." });
  }

  try {
    const response = await fetch(`https://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=${stop}`, {
      headers: {
        "AccountKey": accountKey,
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`LTA DataMall HTTP ${response.status}`);
    }

    const data = await response.json();
    const servicesRaw = data.Services || [];

    const services = servicesRaw.map(svc => {
      const parseMinutes = (estArrival) => {
        if (!estArrival) return null;
        const diffMs = new Date(estArrival).getTime() - Date.now();
        const mins = Math.round(diffMs / 60000);
        return isNaN(mins) ? null : Math.max(0, mins);
      };

      const mapLoad = (loadCode) => {
        if (loadCode === "SEA") return "Seats available";
        if (loadCode === "SDA") return "Standing available";
        if (loadCode === "LSD") return "Limited standing";
        return "Unknown";
      };

      const loadCode = svc.NextBus?.Load;
      const advice = (() => {
        if (loadCode === "LSD") return "Crowded. Wait for the next bus if you can.";
        if (loadCode === "SDA") return "Standing room only.";
        if (loadCode === "SEA") return "Seats available. Go now.";
        return "No crowd data for this bus.";
      })();

      return {
        serviceNo: svc.ServiceNo,
        operator: svc.Operator,
        nextBus: {
          minutes: parseMinutes(svc.NextBus?.EstimatedArrival),
          load: mapLoad(svc.NextBus?.Load),
          advice: advice,
        },
        nextBus2: {
          minutes: parseMinutes(svc.NextBus2?.EstimatedArrival),
          load: mapLoad(svc.NextBus2?.Load),
        },
        nextBus3: {
          minutes: parseMinutes(svc.NextBus3?.EstimatedArrival),
          load: mapLoad(svc.NextBus3?.Load),
        },
      };
    });

    return res.status(200).json({
      success: true,
      busStop: data.BusStopCode || stop,
      services,
      source: "LTA DataMall",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/bus error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable", detail: error.message });
  }
}
