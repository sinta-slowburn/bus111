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
    const response = await fetch(`https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${stop}`, {
      headers: {
        "AccountKey": accountKey,
        "accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`LTA DataMall HTTP ${response.status}`);
    }

    const data = await response.json();
    console.error("LTA v3 raw response keys:", Object.keys(data || {}));
    const servicesRaw = data.Services || data.services || data.BusArrival || data.busArrival || [];

    const services = (Array.isArray(servicesRaw) ? servicesRaw : []).map(svc => {
      const parseMinutes = (estArrival) => {
        if (!estArrival) return null;
        const diffMs = new Date(estArrival).getTime() - Date.now();
        const mins = Math.round(diffMs / 60000);
        return isNaN(mins) ? null : Math.max(0, mins);
      };

      const mapLoad = (loadCode) => {
        if (!loadCode) return "Unknown";
        const code = String(loadCode).toUpperCase();
        if (code === "SEA") return "Seats available";
        if (code === "SDA") return "Standing available";
        if (code === "LSD") return "Limited standing";
        return "Unknown";
      };

      const nextBusObj = svc.NextBus || svc.nextBus || {};
      const nextBus2Obj = svc.NextBus2 || svc.nextBus2 || {};
      const nextBus3Obj = svc.NextBus3 || svc.nextBus3 || {};

      const loadCode = nextBusObj.Load || nextBusObj.load;
      const advice = (() => {
        const code = loadCode ? String(loadCode).toUpperCase() : "";
        if (code === "LSD") return "Crowded. Wait for the next bus if you can.";
        if (code === "SDA") return "Standing room only.";
        if (code === "SEA") return "Seats available. Go now.";
        return "No crowd data for this bus.";
      })();

      // Coordinate extraction and validation logic
      const parseCoordinates = (busObj) => {
        if (!busObj) return null;
        const monitored = Number(busObj.Monitored ?? busObj.monitored ?? 0);
        if (monitored !== 1) return null;

        const latVal = Number(busObj.Latitude ?? busObj.latitude);
        const lngVal = Number(busObj.Longitude ?? busObj.longitude);

        if (
          !isNaN(latVal) &&
          !isNaN(lngVal) &&
          latVal >= 1.1 &&
          latVal <= 1.5 &&
          lngVal >= 103.6 &&
          lngVal <= 104.1
        ) {
          return { lat: latVal, lng: lngVal };
        }
        return null;
      };

      const coordinates = parseCoordinates(nextBusObj) || parseCoordinates(nextBus2Obj) || parseCoordinates(nextBus3Obj) || null;

      return {
        serviceNo: svc.ServiceNo || svc.serviceNo || "Unknown",
        operator: svc.Operator || svc.operator || "Unknown",
        coordinates,
        nextBus: {
          minutes: parseMinutes(nextBusObj.EstimatedArrival || nextBusObj.estimatedArrival),
          load: mapLoad(loadCode),
          advice: advice,
        },
        nextBus2: {
          minutes: parseMinutes(nextBus2Obj.EstimatedArrival || nextBus2Obj.estimatedArrival),
          load: mapLoad(nextBus2Obj.Load || nextBus2Obj.load),
        },
        nextBus3: {
          minutes: parseMinutes(nextBus3Obj.EstimatedArrival || nextBus3Obj.estimatedArrival),
          load: mapLoad(nextBus3Obj.Load || nextBus3Obj.load),
        },
      };
    });

    let topLevelCoordinates = null;
    for (const svc of services) {
      if (svc.coordinates && typeof svc.coordinates.lat === "number" && typeof svc.coordinates.lng === "number") {
        topLevelCoordinates = svc.coordinates;
        break;
      }
    }

    return res.status(200).json({
      success: true,
      busStop: data.BusStopCode || data.busStopCode || stop,
      coordinates: topLevelCoordinates,
      services,
      source: "LTA DataMall",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("api/bus error:", error.message);
    return res.status(500).json({ success: false, error: "Data unavailable" });
  }
}
