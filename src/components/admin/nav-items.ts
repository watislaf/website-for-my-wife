import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Briefcase,
  BarChart3,
  Activity,
  Image,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Planner", href: "/admin/planner", icon: CalendarDays },
  { label: "Goals", href: "/admin/goals", icon: Target },
  { label: "Work", href: "/admin/work", icon: Briefcase },
  { label: "Stats", href: "/admin/stats", icon: BarChart3 },
  { label: "Traffic", href: "/admin/traffic", icon: Activity },
  { label: "Landing", href: "/admin/landing", icon: Image },
];
