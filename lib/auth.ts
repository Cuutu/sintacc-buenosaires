import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import connectDB from "@/lib/mongodb"
import { consumeNativeGoogleGrant } from "@/lib/native-google-auth"
import { consumeNativeAppleGrant } from "@/lib/native-apple-auth"
import { User } from "@/models/User"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []

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
          
          const existingUser = await User.findOne({ email: user.email })
          
          if (existingUser) {
            // Update role if email is in admin list
            if (ADMIN_EMAILS.includes(user.email || "")) {
              existingUser.role = "admin"
              await existingUser.save()
            }
          } else {
            // Create new user
            const newUser = new User({
              email: user.email,
              name: user.name,
              image: user.image,
              role: ADMIN_EMAILS.includes(user.email || "") ? "admin" : "user",
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
      // Lookup User only at sign-in. Protected APIs use requireAuth (one exists check).
      // Avoid duplicate Mongo hits on every JWT refresh.
      if (!providerUser) {
        return token
      }
      try {
        await connectDB()
        const email = providerUser.email
        const dbUser = providerUser.id
          ? await User.findById(providerUser.id)
          : email
            ? await User.findOne({ email })
            : null
        if (dbUser) {
          token.id = dbUser._id.toString()
          token.role = dbUser.role
          token.email = dbUser.email
        } else if (providerUser.id) {
          token.id = providerUser.id
          token.email = providerUser.email ?? token.email
          token.role = (token.role as "user" | "admin") || "user"
        }
      } catch (error) {
        console.error("Error in jwt callback:", error)
      }
      return token
    },
    async session({ session, token }) {
      if (!token.id) {
        return {
          ...session,
          user: undefined as unknown as typeof session.user,
          expires: new Date(0).toISOString(),
        }
      }
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = (token.role as "user" | "admin") || "user"
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
