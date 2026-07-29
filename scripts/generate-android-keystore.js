/**
 * Genera keystore de release para Play Store.
 * Output: secrets/celimap-release.keystore + android/key.properties
 * NUNCA commitear esos archivos.
 */
const { spawnSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const secretsDir = path.join(root, "secrets")
const keystorePath = path.join(secretsDir, "celimap-release.keystore")
const keyPropsPath = path.join(root, "android", "key.properties")

fs.mkdirSync(secretsDir, { recursive: true })

if (fs.existsSync(keystorePath)) {
  console.log("Keystore ya existe:", keystorePath)
  console.log("Si queres regenerar, borralo primero.")
  process.exit(0)
}

function findKeytool() {
  const fromPath = spawnSync("keytool", ["-help"], { encoding: "utf8" })
  if (!fromPath.error) return "keytool"

  const javaHome = process.env.JAVA_HOME
  if (javaHome) {
    const candidate = path.join(
      javaHome,
      "bin",
      process.platform === "win32" ? "keytool.exe" : "keytool"
    )
    if (fs.existsSync(candidate)) return candidate
  }

  console.error("keytool no encontrado. Instala JDK 17+ y agrega al PATH.")
  process.exit(1)
}

function randomPassword(len = 24) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

const keytool = findKeytool()
const storePassword = randomPassword()
const keyPassword = storePassword

const result = spawnSync(
  keytool,
  [
    "-genkeypair",
    "-v",
    "-storetype",
    "PKCS12",
    "-keystore",
    keystorePath,
    "-alias",
    "celimap",
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    "CN=Celimap, OU=Mobile, O=Celimap, L=Buenos Aires, ST=CABA, C=AR",
  ],
  { encoding: "utf8" }
)

if (result.status !== 0) {
  console.error(result.stderr || result.stdout)
  process.exit(result.status || 1)
}

fs.writeFileSync(
  keyPropsPath,
  [
    `storePassword=${storePassword}`,
    `keyPassword=${keyPassword}`,
    `keyAlias=celimap`,
    `storeFile=../secrets/celimap-release.keystore`,
    "",
  ].join("\n"),
  "utf8"
)

console.log("")
console.log("OK keystore:", keystorePath)
console.log("OK key.properties:", keyPropsPath)
console.log(
  "BACKUP offline de secrets/ y key.properties. Sin esto no podes actualizar la app en Play."
)
