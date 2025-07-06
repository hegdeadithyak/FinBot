/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
import { AuthJWT, makeCookie } from "@/lib/auth-jwt";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const { user, token } = await AuthJWT.login(body);
    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { "Set-Cookie": makeCookie(token), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 401 });
  }
}
