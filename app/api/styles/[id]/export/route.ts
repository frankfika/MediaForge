import { getStyle, styleRoute } from "@/lib/styles-db";

/** `My Style! 我的` -> `my-style-我的`. CJK is kept so zh names stay readable. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "") || "style";

// Symmetric cloud path for downloadStyles(filename, [style]): same JSON the client
// generates, but fetchable server-side. styleRoute maps a null return to 404 and
// passes a thrown Response through, which is how we set content-disposition.
export const GET = styleRoute(null, async ({ db, userId, id }) => {
  const style = await getStyle(db, userId, id);
  if (!style) return null;
  throw new Response(JSON.stringify({ style }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${slug(style.name)}.json"`,
    },
  });
});
