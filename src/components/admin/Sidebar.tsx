"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col border-r border-border bg-sidebar md:w-60">
      <div className="flex h-16 items-center gap-2 px-3 md:px-5">
        <span className="text-2xl leading-none" aria-hidden>
          👩‍🍳
        </span>
        <span className="hidden truncate font-heading text-lg font-semibold text-foreground md:inline">
          {landing.name}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-accent-foreground",
                active && "bg-accent/50 text-accent-foreground"
              )}
              title={item.label}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
              <Icon className="size-5 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <form action="/api/logout" method="post">
          <button
            type="submit"
            aria-label="Log out"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-accent-foreground"
            title="Log out"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden md:inline">Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
