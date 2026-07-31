import { authenticate, isAuthError } from "../../../../../lib/server-auth";

export async function GET(request: Request) {
  const user = await authenticate(request);
  if (isAuthError(user)) return user;
  return Response.json({ user });
}
