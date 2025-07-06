/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
/**
 * Stateless Auth for FinBot
 * • Issue JWT on login / registration
 * • Store it in `finbot_session` httpOnly cookie
 * • Verify on every request (no Session table)
 */

import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

/* ─── Config ─────────────────────────────────────── */
const JWT_SECRET = (process.env.JWT_SECRET ?? "CHANGE_ME") as jwt.Secret;
const EXPIRES    = process.env.JWT_EXPIRES_IN ?? "7d";     // e.g. "7d", "12h"

/* ─── Types ──────────────────────────────────────── */
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}
export interface Credentials { email: string; password: string; }

const mapUser = (u: User): AuthUser => ({
  id: u.id,
  email: u.email,
  username: u.username ?? undefined,
  firstName: u.firstName ?? undefined,
  lastName: u.lastName ?? undefined,
});

/* ─── Cookie util ────────────────────────────────── */
export const makeCookie = (token: string) => {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  return [
    `finbot_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ].join("; ");
};

/* ─── Core Service ───────────────────────────────── */
export class AuthJWT {
  /* Hash & compare */
  static hash = (pw: string) => bcrypt.hash(pw, 12);
  static verifyPW = (pw: string, hash: string) => bcrypt.compare(pw, hash);

  /* Sign */
  static sign(userId: string) {
    const opts: SignOptions = { expiresIn: EXPIRES };
    return jwt.sign({ userId }, JWT_SECRET, opts);
  }

  /* Register */
  static async register(data: Credentials & { username?: string; firstName?: string; lastName?: string; }) {
    if (await prisma.user.findUnique({ where: { email: data.email } }))
      throw new Error("Email already in use");

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: await this.hash(data.password),
        lastLoginAt: new Date(),
      },
    });
    const token = this.sign(user.id);
    return { user: mapUser(user), token };
  }

  /* Login */
  static async login({ email, password }: Credentials) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await this.verifyPW(password, user.passwordHash)))
      throw new Error("Invalid email or password");

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.sign(user.id);
    return { user: mapUser(user), token };
  }

  /* Extract & validate token from Request */
  static extractToken(req: Request): string | null {
    const hdr = req.headers.get("authorization");
    if (hdr?.startsWith("Bearer ")) return hdr.slice(7);

    const ck = req.headers.get("cookie") ?? "";
    const m  = ck.match(/finbot_session=([^;]+)/);
    return m ? m[1] : null;
  }

  static async auth(req: Request): Promise<AuthUser | null> {
    const tok = this.extractToken(req);
    if (!tok) return null;

    try {
      const { userId } = jwt.verify(tok, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user ? mapUser(user) : null;
    } catch { return null; }
  }
}
