import type { z } from "zod";
import {
  analysisArrowColorSchema,
  boardThemeSchema,
  pieceThemeSchema,
} from "../schemas/user-preferences.schema";

export type BoardTheme = z.infer<typeof boardThemeSchema>;
export type PieceTheme = z.infer<typeof pieceThemeSchema>;
export type AnalysisArrowColor = z.infer<typeof analysisArrowColorSchema>;
