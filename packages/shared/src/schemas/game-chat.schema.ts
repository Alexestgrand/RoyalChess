import { z } from "zod";

/** Message chat in-game (namespace `/game`). */
export const gameChatContentSchema = z.object({
  content: z.string().min(1).max(200),
});

export type GameChatContentInput = z.infer<typeof gameChatContentSchema>;
