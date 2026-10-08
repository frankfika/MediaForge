// Trivial liveness probe. Always 200, no metrics, no DB, no LLM call.
// Use for load balancer / uptime monitor health checks where you only
// care "is the process alive" and don't want a 503 from a missing
// DATABASE_URL or flaky metrics file to take a node out of rotation.
export const dynamic = "force-dynamic";

export const GET = () => Response.json({ pong: true, at: new Date().toISOString() });
