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
});
