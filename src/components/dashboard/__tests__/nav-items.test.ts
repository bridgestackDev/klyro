import { describe, it, expect } from "vitest";
import { NAV_ITEMS, navItemsForRole } from "../nav-items";

describe("navItemsForRole", () => {
  it("gives owners every nav item", () => {
    const keys = navItemsForRole("owner").map((i) => i.key);
    expect(keys).toEqual(NAV_ITEMS.map((i) => i.key));
  });

  it("limits staff to non-owner-only items (dashboard + agenda)", () => {
    const keys = navItemsForRole("staff").map((i) => i.key);
    expect(keys).toEqual(["dashboard", "agenda"]);
  });

  it("never exposes an owner-only item to staff", () => {
    const ownerOnlyKeys = NAV_ITEMS.filter((i) => i.ownerOnly).map((i) => i.key);
    const staffKeys = new Set(navItemsForRole("staff").map((i) => i.key));
    for (const key of ownerOnlyKeys) {
      expect(staffKeys.has(key)).toBe(false);
    }
  });
});
