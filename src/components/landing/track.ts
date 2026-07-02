type Body = { type: "pageview" | "click"; target?: string; utmSource?: string | null };

function send(body: Body) {
  try {
    const utmSource = new URLSearchParams(window.location.search).get("utm_source");
    const payload = JSON.stringify({ ...body, utmSource });
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
