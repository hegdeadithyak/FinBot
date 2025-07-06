/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */

import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { Session as PrismaSession, User as PrismaUser } from "@prisma/client";

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET ?? "CHANGE-ME-IN-PROD";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface AuthUser {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends LoginCredentials {
    username?: string;
    firstName?: string;
    lastName?: string;
}

function mapUser(u: PrismaUser): AuthUser {
    return {
        id: u.id,
        email: u.email,
        username: u.username ?? undefined,
        firstName: u.firstName ?? undefined,
        lastName: u.lastName ?? undefined,
    };
}
/** Standard HTTP-only cookie (7-day sliding window) */
export function makeCookie(token: string): string {
    const maxAge = 7 * 24 * 60 * 60; // seconds
    return [
        `finbot_session=${encodeURIComponent(token)}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=${maxAge}`,
        process.env.NODE_ENV === "production" ? "Secure" : "",
    ].join("; ");
}
function signJwt(payload: object): string {
    //   const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
    return jwt.sign(payload, JWT_SECRET);
}

export class AuthService {
    static async hashPassword(pw: string) {
        return bcrypt.hash(pw, 12);
    }
    static async verifyPassword(pw: string, hash: string) {
        return bcrypt.compare(pw, hash);
    }

    static async register(data: RegisterData): Promise<{
        user: AuthUser;
        token: string;
        session: PrismaSession;
    }> {
        if (await prisma.user.findUnique({ where: { email: data.email } })) {
            throw new Error("Email already in use");
        }
        if (data.username) {
            const exists = await prisma.user.findUnique({
                where: { username: data.username },
            });
            if (exists) throw new Error("Username already taken");
        }

        const user = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName,
                passwordHash: await this.hashPassword(data.password),
                lastLoginAt: new Date(),
            },
        });

        const token = signJwt({ userId: user.id });
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                sessionToken: token,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000), // 7 days
            },
        });

        return { user: mapUser(user), token, session };
    }




    /*──────────────────────────────────────────────────────────*/
    /*  AuthService.login PATCH                                 */
    /*──────────────────────────────────────────────────────────*/

    static async login(

        { email, password }: LoginCredentials,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ user: AuthUser; token: string; session: PrismaSession }> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
            throw new Error("Invalid email or password");
        }
        const rawToken      = signJwt({ userId: user.id });
        const encodedToken  = encodeURIComponent(rawToken);

        const session = await prisma.session.create({
        data: {
            userId: user.id,
            sessionToken: encodedToken,
            isActive: true,
            expires: new Date(Date.now() + 7 * 86_400_000), // 7 days
        },
        });

        // Caller (API route) returns the Set-Cookie header:
        return { user: mapUser(user), token: encodedToken, session };
    }

    static async logout(sessionToken: string) {
        await prisma.session.update({
            where: { sessionToken },
            data: { isActive: false },
        });
    }
    static async logoutAll(userId: string) {
        await prisma.session.updateMany({
            where: { userId },
            data: { isActive: false },
        });
    }

    static async getSession(token: string): Promise<PrismaSession | null> {
        // 1. Fetch the row by token
        const sess = await prisma.session.findUnique({
            where: { sessionToken: token },
        });

        // 2. Validate it
        if (!sess || !sess.isActive || sess.expires < new Date()) return null;
        return sess;
    }


    static async getUserBySession(token: string): Promise<AuthUser | null> {
        const sess = await prisma.session.findUnique({
            where: { sessionToken: token },
            include: { user: true },
        });
        if (!sess || !sess.isActive || sess.expires < new Date()) return null;
        return mapUser(sess.user);
    }

    static async refreshSession(token: string): Promise<PrismaSession | null> {
        const sess = await this.getSession(token);
        if (!sess) return null;
        return prisma.session.update({
            where: { sessionToken: token },
            data: { expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000) },
        });
    }

    static async cleanExpiredSessions() {
        await prisma.session.deleteMany({
            where: { expires: { lt: new Date() } },
        });
    }
}

export function extractToken(req: Request): string | null {
    console.log(req.headers);
    const authHdr = req.headers.get("authorization");
    if (authHdr?.startsWith("Bearer ")) return authHdr.slice(7);

    const cookie = req.headers.get("cookie") ?? "";
    const match = cookie.match(/finbot_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export async function auth(
    req?: Request,
): Promise<{ user: AuthUser; sessionToken: string } | null> {
    const token = req ? extractToken(req) : null;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const session = await AuthService.getSession(token);
        if (!session || session.userId !== decoded.userId) return null;

        const user = await AuthService.getUserBySession(token);
        return user ? { user, sessionToken: token } : null;
    } catch {
        return null;
    }
}
