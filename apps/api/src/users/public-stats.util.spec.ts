import { computeWinRatePct } from "./public-stats.util";

describe("computeWinRatePct", () => {
  it("renvoie 0 si aucune partie décisive", () => {
    expect(computeWinRatePct(0, 0, 0)).toBe(0);
  });

  it("100 % si uniquement des victoires", () => {
    expect(computeWinRatePct(3, 0, 0)).toBe(100);
  });

  it("50 % avec autant de victoires que de défaites", () => {
    expect(computeWinRatePct(2, 2, 0)).toBe(50);
  });

  it("intègre les nulles à 0,5 point", () => {
    expect(computeWinRatePct(1, 1, 2)).toBe(50);
  });

  it("arrondit à l’entier le plus proche", () => {
    expect(computeWinRatePct(1, 0, 0)).toBe(100);
    expect(computeWinRatePct(0, 1, 1)).toBe(25);
  });
});
