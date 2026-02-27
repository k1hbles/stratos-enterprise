import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers";
import { seedCoreMemory } from "@/lib/db/seed-memory";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check ALLOWED_EMAILS whitelist
    const allowedEmails = process.env.ALLOWED_EMAILS;
    if (allowedEmails) {
      const whitelist = allowedEmails.split(",").map((e) => e.trim().toLowerCase());
      if (!whitelist.includes(email.toLowerCase())) {
        return Response.json(
          { error: "Registration is restricted" },
          { status: 403 }
        );
      }
    }

    const db = getDb();

    // Check if user already exists
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.prepare(
      "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
    ).run(userId, email, passwordHash);

    db.prepare(
      "INSERT INTO user_profiles (id, user_id) VALUES (?, ?)"
    ).run(profileId, userId);

    // Seed core memories for the new user
    seedCoreMemory(userId);

    const token = signToken(userId);
    const cookieStore = await cookies();
    cookieStore.set("hyprnova_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
