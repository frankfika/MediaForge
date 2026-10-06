import { z } from "zod";
import { buildExport } from "@/lib/export";
import { route } from "@/lib/http";
import { inc } from "@/lib/metrics";
import { PlatformPostSchema } from "@/lib/types";

// ponytail: stateless, takes posts+media directly. articleId lookup lands with DB wiring.
export const POST = route(
  z.object({
    posts: z.array(PlatformPostSchema).min(1),
    media: z.object({ images: z.array(z.string()), videos: z.array(z.string()) }).default({ images: [], videos: [] }),
  }),
  async (body) => (inc("exports"), buildExport(body)),
);
