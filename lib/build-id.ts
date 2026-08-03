/** Identificadores públicos de build (no secretos). */

export function getPublicBuildSha(): string {
  return (
    process.env.NEXT_PUBLIC_BUILD_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "local"
  ).slice(0, 12)
}

export function getPublicDeploymentId(): string | undefined {
  const id = (process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || "").trim()
  return id ? id.slice(0, 64) : undefined
}
