/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "./prisma"
import type { Session } from "inspector/promises"

  
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"

export interface AuthUser {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  preferredLanguage: string
  voiceEnabled: boolean
  autoReadMessages: boolean
  theme: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  username?: string
  firstName?: string
  lastName?: string
  preferredLanguage?: string
}

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // Generate JWT token
  static generateToken(userId: string): string {
    //@ts-ignore
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  }

  // Verify JWT token
  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      return decoded
    } catch (error) {
      return null
    }
  }

  // Register new user
  static async register(data: RegisterData): Promise<{ user: AuthUser; token: string; session: Session }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new Error("User already exists with this email")
    }

    // Check username if provided
    if (data.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: data.username },
      })

      if (existingUsername) {
        throw new Error("Username already taken")
      }
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        preferredLanguage: data.preferredLanguage || "English",
        lastLoginAt: new Date(),
      },
    })

    // Generate token
    const token = this.generateToken(user.id)

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      preferredLanguage: user.preferredLanguage,
      voiceEnabled: user.voiceEnabled,
      autoReadMessages: user.autoReadMessages,
      theme: user.theme,
    }

    return { user: authUser, token, session }
  }

  // Login user
  static async login(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string,

): Promise<{ user: AuthUser; token: string; session: Session }> {

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    })

    if (!user) {
      throw new Error("Invalid email or password")
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash)

    if (!isValidPassword) {
      throw new Error("Invalid email or password")
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate token
    const token = this.generateToken(user.id)

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress,
        userAgent,
      },
    })

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      preferredLanguage: user.preferredLanguage,
      voiceEnabled: user.voiceEnabled,
      autoReadMessages: user.autoReadMessages,
      theme: user.theme,
    }

    return { user: authUser, token, session }
  }

  // Logout user
  static async logout(sessionToken: string): Promise<void> {
    await prisma.session.update({
      where: { sessionToken },
      data: { isActive: false },
    })
  }

  // Logout all sessions for user
  static async logoutAll(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { isActive: false },
    })
  }

  // Get user by session token
  static async getUserBySession(sessionToken: string): Promise<AuthUser | null> {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    })

    if (!session || !session.isActive || session.expires < new Date()) {
      return null
    }

    const user = session.user

    return {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      preferredLanguage: user.preferredLanguage,
      voiceEnabled: user.voiceEnabled,
      autoReadMessages: user.autoReadMessages,
      theme: user.theme,
    }
  }

  // Refresh session
  static async refreshSession(sessionToken: string): Promise<Session | null> {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
    })

    if (!session || !session.isActive) {
      return null
    }

    // Extend session by 7 days
    const updatedSession = await prisma.session.update({
      where: { sessionToken },
      data: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return updatedSession
  }

  // Clean expired sessions
  static async cleanExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    })
  }
}
