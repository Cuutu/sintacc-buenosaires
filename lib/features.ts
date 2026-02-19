// Feature flags para controlar fases del proyecto
const FEATURES = process.env.FEATURES || "phase1"

export const features = {
  phase1: true,
  phase2: FEATURES.includes("phase2"),
  phase3: FEATURES.includes("phase3"),
  
  // Fase 2 features
  safetyLevel: FEATURES.includes("phase2"),
  photos: FEATURES.includes("phase2"),
  nearMe: true,
  favorites: true,
  communityConfidence: FEATURES.includes("phase2"),
  freshness: FEATURES.includes("phase2"),
  
  // Fase 3 features
  gamification: FEATURES.includes("phase3"),
  pwa: FEATURES.includes("phase3"),
  seo: FEATURES.includes("phase3"),
  advancedModeration: FEATURES.includes("phase3"),
  analytics: FEATURES.includes("phase3"),
}
