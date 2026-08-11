import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import connectDB from "@/lib/mongodb"
import { consumeNativeGoogleGrant } from "@/lib/native-google-auth"
import { consumeNativeAppleGrant } from "@/lib/native-apple-auth"
import { User, type IUser } from "@/models/User"
import type { JWT } from "next-auth/jwt"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []

/** Strict 24-hex Mongo ObjectId (rejects Google subs and loose mongoose isValid matches). */
const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i

export function isMongoObjectIdString(id: unknown): id is string {
  return typeof id === "string" && MONGO_OBJECT_ID_RE.test(id)
}

export function normalizeAuthEmail(email: unknown): string | null {
  if (typeof email !== "string") return null
  const normalized = email.trim().toLowerCase()
  return normalized.includes("@") ? normalized : null
}

function applyDbUserToToken(token: JWT, dbUser: IUser): void {
  token.id = dbUser._id.toString()
  token.role = dbUser.role
  token.email = dbUser.email
}

async function findUserByEmail(email: string): Promise<IUser | null> {
  const exact = await User.findOne({ email })
  if (exact) return exact
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return User.findOne({ email: { $regex: `^${escaped}$`, $options: "i" } })
}

/**
 * Sign-in resolution:
 * - Native grant Mongo id → findById only
 * - Google OAuth sub → email only (never findById with Google sub)
 */
async function resolveDbUserOnSignIn(providerUser: {
  id?: string
  email?: string | null
}): Promise<IUser | null> {
  if (providerUser.id && isMongoObjectIdString(providerUser.id)) {
    const byId = await User.findById(providerUser.id)
    if (byId) return byId
  }

  const email = normalizeAuthEmail(providerUser.email)
  if (email) return findUserByEmail(email)
  return null
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Opaque one-time grant from POST /api/auth/native/google (Capacitor SDK → WebView cookie).
    CredentialsProvider({
      id: "native-google",
      name: "Native Google",
      credentials: {
        grant: { label: "Grant", type: "text" },
      },
      async authorize(credentials) {
        const grant = credentials?.grant
        if (!grant || typeof grant !== "string") return null
        const user = await consumeNativeGoogleGrant(grant)
        if (!user) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
    // Opaque one-time grant from POST /api/auth/native/apple (Sign in with Apple → WebView cookie).
    CredentialsProvider({
      id: "native-apple",
      name: "Native Apple",
      credentials: {
        grant: { label: "Grant", type: "text" },
      },
      async authorize(credentials) {
        const grant = credentials?.grant
        if (!grant || typeof grant !== "string") return null
        const user = await consumeNativeAppleGrant(grant)
        if (!user) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB()

          const email = normalizeAuthEmail(user.email)
          if (!email) return false

          const existingUser = await findUserByEmail(email)

          if (existingUser) {
            if (ADMIN_EMAILS.includes(email)) {
              existingUser.role = "admin"
              await existingUser.save()
            }
          } else {
            const newUser = new User({
              email,
              name: user.name,
              image: user.image,
              role: ADMIN_EMAILS.includes(email) ? "admin" : "user",
            })
            await newUser.save()
          }
        } catch (error) {
          console.error("Error in signIn callback:", error)
          return false
        }
      }
      // native-google / native-apple: user already upserted when grant was created
      return true
    },
    async jwt({ token, user: providerUser }) {
      // Drop non-Mongo ids left by the 63fd027 regression (e.g. Google sub).
      if (token.id && !isMongoObjectIdString(token.id)) {
        delete token.id
      }

      // Refresh with a valid Mongo id: keep claims. Existence checks live in requireAuth.
      if (!providerUser && isMongoObjectIdString(token.id)) {
        return token
      }

      try {
        await connectDB()

        if (providerUser) {
          const dbUser = await resolveDbUserOnSignIn(providerUser)
          if (dbUser) {
            applyDbUserToToken(token, dbUser)
          } else {
            // Never store Google sub / unknown provider id as token.id.
            delete token.id
          }
          return token
        }

        // Refresh without valid Mongo id: heal broken cookies via email when safe.
        const email = normalizeAuthEmail(token.email)
        if (email) {
          const dbUser = await findUserByEmail(email)
          if (dbUser) {
            applyDbUserToToken(token, dbUser)
          }
        }
      } catch (error) {
        // Transient DB failure: do not clear a valid token.id; do not mark deleted.
        console.error("Error in jwt callback:", error)
      }

      return token
    },
    async session({ session, token }) {
      // Only propagate a real Mongo _id. Never fabricate expires:1970 empty profiles.
      if (!isMongoObjectIdString(token.id)) {
        return {
          ...session,
          user: undefined as unknown as typeof session.user,
        }
      }
      if (session.user) {
        session.user.id = token.id
        session.user.role = (token.role as "user" | "admin") || "user"
        if (typeof token.email === "string") {
          session.user.email = token.email
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "user" | "admin"
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      role: "user" | "admin"
    }
  }
}
