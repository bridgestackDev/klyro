import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  Scissors,
  Settings,
  Link as LinkIcon,
} from "lucide-react";

export interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "agenda", href: "/agenda", icon: Calendar },
  { key: "team", href: "/team", icon: Users },
  { key: "branches", href: "/branches", icon: MapPin },
  { key: "services", href: "/services", icon: Scissors },
  { key: "links", href: "/links", icon: LinkIcon },
  { key: "settings", href: "/settings", icon: Settings },
];
