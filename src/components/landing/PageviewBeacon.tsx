"use client";

import { useEffect } from "react";
import { trackPageview } from "./track";

export function PageviewBeacon() {
  useEffect(() => {
    trackPageview();
  }, []);
  return null;
}
