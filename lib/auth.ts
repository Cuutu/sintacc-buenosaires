import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import connectDB from "@/lib/mongodb"
import { User } from "@/models/User"

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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
      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          await connectDB()
          const user = await User.findOne({ email: session.user.email })
          if (user) {
            session.user.id = user._id.toString()
            session.user.role = user.role
          }
        } catch (error) {
          console.error("Error in session callback:", error)
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
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
