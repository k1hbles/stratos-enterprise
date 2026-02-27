import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("hyprnova_session");
  return Response.json({ success: true });
}
