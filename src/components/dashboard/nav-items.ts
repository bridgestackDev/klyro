import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  Scissors,
  Settings,
  Link as LinkIcon,
} from "lucide-react";

export type UserRole = "owner" | "staff";

export interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  /** When true, only owners see this item. Staff get a redirect if they navigate to it. */
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "agenda", href: "/agenda", icon: Calendar },
  { key: "team", href: "/team", icon: Users, ownerOnly: true },
  { key: "branches", href: "/branches", icon: MapPin, ownerOnly: true },
  { key: "services", href: "/services", icon: Scissors, ownerOnly: true },
  { key: "links", href: "/links", icon: LinkIcon, ownerOnly: true },
  { key: "settings", href: "/settings", icon: Settings, ownerOnly: true },
];

/** Nav items visible to a given role. Staff see only non-owner-only items. */
export function navItemsForRole(role: UserRole): NavItem[] {
  return role === "owner" ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.ownerOnly);
}
