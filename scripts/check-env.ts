#!/usr/bin/env tsx

/**
 * Script para verificar que todas las variables de entorno necesarias estén configuradas
 */

const requiredEnvVars = [
  "MONGODB_URI",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
]

const optionalEnvVars = [
  "ADMIN_EMAILS",
  "FEATURES",
]

function checkEnv() {
  console.log("🔍 Verificando variables de entorno...\n")

  const missing: string[] = []
  const present: string[] = []
  const warnings: string[] = []

  // Check required vars
  requiredEnvVars.forEach((varName) => {
    if (process.env[varName]) {
      present.push(varName)
      // Mask sensitive values
      const value = process.env[varName] || ""
      const masked = varName.includes("SECRET") || varName.includes("KEY")
        ? "*".repeat(Math.min(value.length, 20))
        : value.substring(0, 50)
      console.log(`✅ ${varName}: ${masked}`)
    } else {
      missing.push(varName)
      console.log(`❌ ${varName}: NO CONFIGURADA`)
    }
  })

  // Check optional vars
  console.log("\n📋 Variables opcionales:")
  optionalEnvVars.forEach((varName) => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${process.env[varName]}`)
    } else {
      console.log(`⚠️  ${varName}: No configurada (opcional)`)
      warnings.push(varName)
    }
  })

  // Summary
  console.log("\n" + "=".repeat(50))
  if (missing.length === 0) {
    console.log("✅ Todas las variables requeridas están configuradas")
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} variable(s) opcional(es) no configurada(s)`)
    }
    console.log("\n🚀 Puedes ejecutar 'npm run dev' para iniciar el servidor")
  } else {
    console.log(`❌ Faltan ${missing.length} variable(s) requerida(s):`)
    missing.forEach((varName) => {
      console.log(`   - ${varName}`)
    })
    console.log("\n📝 Revisa el archivo .env.example para ver cómo configurarlas")
    process.exit(1)
  }
}

checkEnv()
