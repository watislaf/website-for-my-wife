// Generic admin skeleton shown while a segment's server queries run.
// Kept intentionally simple so it reads fine for any /admin route.
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={
              i === 2
                ? "h-40 animate-pulse rounded-xl bg-muted lg:col-span-2"
                : "h-40 animate-pulse rounded-xl bg-muted"
            }
          />
        ))}
      </div>
    </div>
  );
}
