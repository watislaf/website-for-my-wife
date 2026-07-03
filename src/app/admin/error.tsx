"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// Segment-level error boundary for /admin routes. A DB hiccup while loading a
// page shows this fallback instead of blanking the whole route.
// Next 16: `unstable_retry()` re-fetches + re-renders the segment (the right
// recovery for a transient data-fetch failure); `reset()` only clears the
// error state without re-running the queries.
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          Something went wrong loading this page
        </h2>
        <p className="text-sm text-muted-foreground">
          A transient error occurred. Try again.
        </p>
      </div>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
