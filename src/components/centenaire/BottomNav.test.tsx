import { renderToStaticMarkup } from "react-dom/server";
import { Dumbbell } from "lucide-react";
import { describe, expect, it } from "vitest";
import { BottomNav } from "@/components/centenaire/BottomNav";

describe("BottomNav", () => {
  it("répartit cinq destinations sur cinq colonnes stables", () => {
    const items = ["today", "journal", "recipes", "sport", "profile"].map(
      (id) => ({ id, icon: Dumbbell, label: id }),
    );
    const html = renderToStaticMarkup(
      <BottomNav
        activeId="today"
        items={items}
        onChange={() => {}}
      />,
    );

    expect(html).toContain(
      "grid-template-columns:repeat(5, minmax(0, 1fr))",
    );
    expect(html).toContain(">sport<");
    expect(html).toContain(">recipes<");
  });

  it("rend les destinations de route avec des liens Next préchargeables", () => {
    const html = renderToStaticMarkup(
      <BottomNav
        activeId="recipes"
        items={[
          {
            href: "/recipes",
            icon: Dumbbell,
            id: "recipes",
            label: "Recettes",
          },
          {
            href: "/sport",
            icon: Dumbbell,
            id: "sport",
            label: "Sport",
          },
        ]}
      />,
    );

    expect(html).toContain('href="/recipes"');
    expect(html).toContain('href="/sport"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("pc-bottom-nav-item-active");
    expect(html).toContain("pc-bottom-nav-icon-frame");
    expect(html).toContain("-translate-y-3");
  });
});
