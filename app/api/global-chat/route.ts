// Same agent as /api/chat; separate path so the ⌘K drawer can diverge (own tools/limits) later.
export { POST } from "../chat/route";
export const maxDuration = 60;
