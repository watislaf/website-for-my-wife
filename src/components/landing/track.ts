type Body = {
  type: "pageview" | "click";
  target?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

function send(body: Body) {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const payload = JSON.stringify({ ...body, utmSource, utmMedium, utmCampaign });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  } catch {
    /* analytics must never break the page */
  }
}

export function trackPageview() {
  send({ type: "pageview" });
}

export function trackClick(target: string) {
  send({ type: "click", target });
}
