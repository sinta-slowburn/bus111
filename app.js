/**
 * File: app.js
 * Description: Client-side logic for CROWDCON shippable demo.
 */

import { stationNames } from "./data/station-names.js";
import { busStops } from "./data/bus-stops.js";

const SINGAPORE_LOCATIONS = [
  { id: "orchard", name: "Orchard Road Corridor", stationCode: "NS22 / TE14", type: "Shopping Corridor", lat: 1.3048, lng: 103.8318 },
  { id: "dhoby-ghaut", name: "Dhoby Ghaut Interchange", stationCode: "NS24 / NE6 / CC1", type: "Mega Interchange", lat: 1.2989, lng: 103.8456 },
  { id: "marina-bay", name: "Marina Bay Sands", stationCode: "CE1 / DT16", type: "Sightseeing & Events", lat: 1.2834, lng: 103.8607 },
  { id: "bugis", name: "Bugis Junction", stationCode: "EW12 / DT14", type: "Retail & Transit", lat: 1.3006, lng: 103.8558 },
  { id: "botanic-gardens", name: "Singapore Botanic Gardens", stationCode: "CC19 / DT9", type: "Nature Park", lat: 1.3138, lng: 103.8159 },
];

document.addEventListener("DOMContentLoaded", () => {
  setupLiveBusPanel();
  setupLiveTrainPanel();
  fetchLiveWeather();
  announceToScreenReader("");
});

function announceToScreenReader(message) {
  const announcer = document.getElementById("screen-reader-announcer");
  if (announcer) {
    announcer.textContent = message;
  }
}

function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");

  let iconName = "info";
  if (type === "warning" || type === "error") iconName = "warning";
  if (type === "success") iconName = "check_circle";

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: ${type === 'error' ? 'var(--color-error)' : 'var(--color-primary)'}; font-size:1.75rem;" aria-hidden="true">${iconName}</span>
    <div style="flex:1;">
      <h5 class="font-headline-md" style="font-size:1rem; margin-bottom:2px; text-transform:uppercase;">${title}</h5>
      <p class="font-body-md" style="font-size:0.875rem;">${message}</p>
    </div>
  `;

  container.appendChild(toast);
  announceToScreenReader(`${title}: ${message}`);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function fetchLiveWeather(lat = null, lng = null, stopCode = null, selectedArea = null) {
  const condText = document.getElementById("weather-condition-text");
  const areaText = document.getElementById("weather-area-text");
  const areaSelect = document.getElementById("weather-area-select");
  const footer = document.getElementById("weather-meta-footer");

  try {
    let url = "/api/weather";
    if (selectedArea) {
      url = `/api/weather?area=${encodeURIComponent(selectedArea)}`;
    } else if (lat !== null && lng !== null) {
      url = `/api/weather?lat=${lat}&lng=${lng}`;
    } else {
      url = `/api/weather?area=City`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch weather");
    }

    if (condText) condText.textContent = `${data.area} - ${data.forecast}`;
    if (areaText) {
      if (lat !== null && lng !== null && stopCode) {
        areaText.textContent = `Nearest weather area to the approaching bus at stop ${stopCode}`;
      } else {
        areaText.textContent = "";
      }
    }

    if (areaSelect && data.areas && Array.isArray(data.areas)) {
      areaSelect.style.display = "block";
      areaSelect.innerHTML = "";
      data.areas.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = a;
        if (a === data.area) {
          opt.selected = true;
        }
        areaSelect.appendChild(opt);
      });
      areaSelect.value = data.area;

      if (!areaSelect.dataset.listenerAttached) {
        areaSelect.addEventListener("change", () => {
          const val = areaSelect.value;
          if (val) {
            fetchLiveWeather(null, null, null, val);
          }
        });
        areaSelect.dataset.listenerAttached = "true";
      }
    }

    if (footer) {
      footer.textContent = `Source: ${data.source} • Fetched at ${new Date(data.fetchedAt).toLocaleTimeString()}`;
    }

    announceToScreenReader(`Weather updated to ${data.area}`);
  } catch (err) {
    console.error("Live weather error:", err);
  }
}

function setupLiveBusPanel() {
  const input = document.getElementById("bus-stop-input");
  const btn = document.getElementById("btn-fetch-bus");
  const list = document.getElementById("bus-results-list");
  const footer = document.getElementById("bus-meta-footer");
  const dropdown = document.getElementById("bus-autocomplete-dropdown");

  if (!input || !btn || !list) return;

  function hideDropdown() {
    if (dropdown) dropdown.style.display = "none";
  }

  function showDropdown(matches) {
    if (!dropdown) return;
    if (matches.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    dropdown.innerHTML = "";
    matches.forEach(m => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.style.cssText = "padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--color-surface-container-highest); display: flex; justify-content: space-between; align-items: center; background: var(--color-surface-bright);";
      item.innerHTML = `
        <div>
          <span style="font-weight: 700; color: var(--color-primary); margin-right: 8px;">${m.code}</span>
          <span style="font-weight: 700;">${m.name}</span>
          <div style="font-size: 0.75rem; color: var(--color-on-surface-variant);">${m.road}</div>
        </div>
      `;
      item.addEventListener("mouseenter", () => {
        item.style.background = "var(--color-surface-container)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "var(--color-surface-bright)";
      });
      item.addEventListener("click", () => {
        input.value = m.code;
        hideDropdown();
        handleFetch();
      });
      dropdown.appendChild(item);
    });

    dropdown.style.display = "block";
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < 1) {
      hideDropdown();
      return;
    }

    const matches = busStops.filter(s => 
      s.code.toLowerCase().includes(query) ||
      s.name.toLowerCase().includes(query) ||
      s.road.toLowerCase().includes(query)
    ).slice(0, 10);

    showDropdown(matches);
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
      hideDropdown();
    }
  });

  async function handleFetch() {
    hideDropdown();
    const rawInput = input.value.trim();
    let stopCode = rawInput;
    let matchedStop = null;

    if (/^\d{5}$/.test(rawInput)) {
      matchedStop = busStops.find(s => s.code === rawInput);
    } else {
      const query = rawInput.toLowerCase();
      matchedStop = busStops.find(s => 
        s.code.toLowerCase() === query ||
        s.name.toLowerCase().includes(query) ||
        s.road.toLowerCase().includes(query)
      );
      if (matchedStop) {
        stopCode = matchedStop.code;
        input.value = matchedStop.code;
      } else {
        list.innerHTML = `<li class="hotspot-item" style="color:var(--color-error); font-weight:700;">Data unavailable: Bus stop not found. Please enter a valid 5-digit code, road name, or description.</li>`;
        announceToScreenReader("Bus stop not found");
        return;
      }
    }

    list.innerHTML = `<li class="hotspot-item"><span class="hotspot-item-title">Fetching live telemetry for stop ${stopCode}...</span></li>`;
    announceToScreenReader(`Loading bus stop ${stopCode}`);

    // Update weather immediately based on bus stop coordinates or fallback to City
    if (matchedStop && typeof matchedStop.lat === "number" && typeof matchedStop.lng === "number") {
      fetchLiveWeather(matchedStop.lat, matchedStop.lng, stopCode);
    } else {
      fetchLiveWeather(null, null, null, "City");
    }

    try {
      const res = await fetch(`/api/bus?stop=${stopCode}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Data unavailable");
      }

      if (!data.services || data.services.length === 0) {
        list.innerHTML = `<li class="hotspot-item"><span class="hotspot-item-title">No active bus arrivals found for stop ${stopCode}.</span></li>`;
        if (footer) footer.textContent = "Source: LTA DataMall • No active services";
        announceToScreenReader("0 services found");
        return;
      }

      if (footer) {
        footer.textContent = `Source: ${data.source} • Fetched at ${new Date(data.fetchedAt).toLocaleTimeString()}`;
      }

      // If matchedStop didn't have coordinates, fallback to data.coordinates if available
      if ((!matchedStop || typeof matchedStop.lat !== "number") && data.coordinates) {
        fetchLiveWeather(data.coordinates.lat, data.coordinates.lng, stopCode);
      }

      list.innerHTML = "";
      data.services.forEach(svc => {
        const li = document.createElement("li");
        li.className = "hotspot-item";
        li.style.display = "block";

        const nextMins = svc.nextBus.minutes !== null ? `${svc.nextBus.minutes} min` : "Arr";
        const next2Mins = svc.nextBus2.minutes !== null ? `${svc.nextBus2.minutes}m` : "-";
        const next3Mins = svc.nextBus3.minutes !== null ? `${svc.nextBus3.minutes}m` : "-";

        let loadIcon = "event_seat";
        if (svc.nextBus.load === "Standing available") loadIcon = "airline_seat_legroom_normal";
        if (svc.nextBus.load === "Limited standing") loadIcon = "warning";

        li.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <span style="font-weight:900; font-size:1.125rem; background:var(--color-primary); color:var(--color-on-primary); padding:2px 6px; margin-right:8px;">${svc.serviceNo}</span>
              <span style="font-weight:700;">Next Bus: ${nextMins}</span>
              <div style="font-size:0.75rem; color:var(--color-on-surface-variant); margin-top:2px;">Subsequent: ${next2Mins}, ${next3Mins}</div>
            </div>
            <div style="display:flex; align-items:center; gap:4px; font-weight:700;">
              <span class="material-symbols-outlined" aria-hidden="true">${loadIcon}</span>
              <span>${svc.nextBus.load}</span>
            </div>
          </div>
          <div style="background:var(--color-surface-container); padding:8px 12px; font-size:0.875rem; font-weight:700;">
            Should You Go? ${svc.nextBus.advice}
          </div>
        `;
        list.appendChild(li);
      });

      announceToScreenReader(`${data.services.length} services found`);
    } catch (err) {
      console.error("Live bus fetch error:", err);
      list.innerHTML = `<li class="hotspot-item" style="color:var(--color-error); font-weight:700;">Data unavailable: ${err.message || "Failed to fetch live bus telemetry."}</li>`;
      announceToScreenReader("Data unavailable");
      showToast("Bus Error", err.message || "Data unavailable", "error");
    }
  }

  btn.addEventListener("click", handleFetch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetch();
    }
  });

  const btnNearMe = document.getElementById("btn-near-me");
  if (btnNearMe) {
    btnNearMe.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("Geolocation", "Geolocation is not supported by your browser", "error");
        return;
      }

      announceToScreenReader("Finding your current location...");
      showToast("Location", "Requesting your GPS location...", "info");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          let nearestStop = null;
          let minDistance = Infinity;

          busStops.forEach(stop => {
            if (typeof stop.lat === "number" && typeof stop.lng === "number") {
              const dist = Math.hypot(stop.lat - userLat, stop.lng - userLng);
              if (dist < minDistance) {
                minDistance = dist;
                nearestStop = stop;
              }
            }
          });

          if (nearestStop) {
            input.value = nearestStop.code;
            showToast("Nearest Stop Found", `Found ${nearestStop.name} (${nearestStop.code})`, "success");
            handleFetch();
          } else {
            showToast("Location Error", "No nearby bus stops found in dataset", "error");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          showToast("Location Error", "Unable to retrieve your location. Please check permissions.", "error");
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    });
  }
}

function setupLiveTrainPanel() {
  const select = document.getElementById("train-line-select");
  const btn = document.getElementById("btn-fetch-train");
  const list = document.getElementById("train-results-list");
  const footer = document.getElementById("train-meta-footer");

  if (!select || !btn || !list) return;

  async function handleFetch() {
    const line = select.value;
    if (!line) {
      list.innerHTML = `<li class="hotspot-item" style="color:var(--color-error); font-weight:700;">Data unavailable: Please select a train line.</li>`;
      announceToScreenReader("Please select a train line.");
      return;
    }

    list.innerHTML = `<li class="hotspot-item"><span class="hotspot-item-title">Fetching live crowd levels for line ${line}...</span></li>`;
    announceToScreenReader(`Fetching live train crowd levels for line ${line}`);

    try {
      const res = await fetch(`/api/train?line=${line}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Data unavailable");
      }

      if (!data.stations || data.stations.length === 0) {
        list.innerHTML = `<li class="hotspot-item"><span class="hotspot-item-title">No station crowd data found for line ${line}.</span></li>`;
        if (footer) footer.textContent = "Source: LTA DataMall • No stations found";
        return;
      }

      if (footer) {
        footer.textContent = `Source: ${data.source} • Fetched at ${new Date(data.fetchedAt).toLocaleTimeString()}`;
      }

      list.innerHTML = "";
      data.stations.forEach(st => {
        const li = document.createElement("li");
        li.className = "hotspot-item";
        li.style.display = "block";

        let crowdIcon = "info";
        if (st.crowdLevel === "Low") crowdIcon = "sentiment_satisfied";
        if (st.crowdLevel === "Moderate") crowdIcon = "sentiment_neutral";
        if (st.crowdLevel === "High") crowdIcon = "warning";

        const resolvedName = stationNames[st.stationID];
        const stationDisplay = resolvedName ? `${resolvedName} (${st.stationID})` : st.stationID;

        li.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-weight:700; font-size:1.125rem;">${stationDisplay}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; font-weight:700;">
              <span class="material-symbols-outlined" aria-hidden="true">${crowdIcon}</span>
              <span>Crowd: ${st.crowdLevel}</span>
            </div>
          </div>
        `;
        list.appendChild(li);
      });

      announceToScreenReader(`Loaded live train crowd levels for line ${line}`);
    } catch (err) {
      console.error("Live train fetch error:", err);
      list.innerHTML = `<li class="hotspot-item" style="color:var(--color-error); font-weight:700;">Data unavailable: ${err.message || "Failed to fetch train crowd telemetry."}</li>`;
      announceToScreenReader("Data unavailable: Error fetching live train crowd levels.");
      showToast("Train Error", err.message || "Data unavailable", "error");
    }
  }

  btn.addEventListener("click", handleFetch);
  select.addEventListener("change", handleFetch);
}
