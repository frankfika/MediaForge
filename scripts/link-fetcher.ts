// Usage: pnpm fetch <url>   ->  prints {title, author, text, images[], videos[]} as JSON
import { fetchLink } from "../lib/fetcher";

const url = process.argv[2];
if (!url) {
  console.error("usage: pnpm fetch <url>");
  process.exit(1);
}
fetchLink(url)
  .then((s) => console.log(JSON.stringify(s, null, 2)))
  .catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
