import { openapiSpec } from "@/lib/openapi-spec";

export const dynamic = "force-dynamic";

export const GET = () =>
  Response.json(openapiSpec, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300",
    },
  });
