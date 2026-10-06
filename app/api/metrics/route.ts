import { snapshot } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export const GET = () => Response.json(snapshot());
