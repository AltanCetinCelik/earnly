import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SwapPage from "@/app/app/payments/swap/page";

/**
 * The Swap destination is a placeholder by design. These assertions pin the
 * exact required copy and, just as importantly, prove there is no control that
 * could be mistaken for a working swap.
 */
describe("swap placeholder", () => {
  const html = renderToStaticMarkup(<SwapPage />);

  it("uses the exact required labels", () => {
    expect(html).toContain(">Swap<");
    expect(html).toContain("Swap between blockchain");
    expect(html).toMatch(/Coming soon/i);
    expect(html).toContain("COMING SOON");
  });

  it("cannot start a trade", () => {
    // No amount inputs, no execution control, no quoted output.
    expect(html).not.toContain("<input");
    for (const phrase of ["Confirm swap", "Swap now", "Get quote", "You receive", "Estimated output"]) {
      expect(html.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
    const buttons = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) =>
      m[1].replace(/<[^>]*>/g, "").trim().toLowerCase()
    );
    // The only control on the page captures interest; nothing executes a trade.
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toMatch(/tell me when swaps open|on the list/);
  });

  it("states plainly that nothing is traded", () => {
    expect(html).toMatch(/No rate is fetched|quotes nothing|not built/i);
  });
});
