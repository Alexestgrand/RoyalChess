import type { ReactElement } from "react";

/** Mini échiquier décoratif (SVG inline) pour états vides. */
export function EmptyChessBoard(): ReactElement {
  const cells: ReactElement[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isLight = (f + r) % 2 === 0;
      const x = f * 10;
      const y = r * 10;
      cells.push(
        <rect
          key={`${r}-${f}`}
          x={x}
          y={y}
          width={10}
          height={10}
          fill={isLight ? "#f0d9b5" : "#b58863"}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 80 80" className="mx-auto size-24 opacity-90" aria-hidden>
      {cells}
    </svg>
  );
}
