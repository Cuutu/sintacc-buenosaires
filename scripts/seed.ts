import mongoose from "mongoose"
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"
import { User } from "../models/User"
import placesData from "../data/places.seed.json"

async function seed() {
  try {
    await connectDB()
    console.log("✅ Conectado a MongoDB")

    // Clear existing places (optional - comment out if you want to keep existing data)
    await Place.deleteMany({})
    console.log("🗑️  Lugares existentes eliminados")

    // Insert places
    const places = await Place.insertMany(placesData)
    console.log(`✅ ${places.length} lugares insertados`)

    // Create admin user if ADMIN_EMAILS is set
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || []
    
    if (adminEmails.length > 0) {
      for (const email of adminEmails) {
        await User.findOneAndUpdate(
          { email },
          { email, name: "Admin", role: "admin" },
          { upsert: true }
        )
        console.log(`✅ Usuario admin creado/actualizado: ${email}`)
      }
    }

    console.log("🎉 Seed completado exitosamente")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error en seed:", error)
    process.exit(1)
  }
}

seed()
