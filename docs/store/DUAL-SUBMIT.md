# Submit simultáneo — checklist

Usar cuando:
- [ ] Android Internal testing OK
- [ ] iOS TestFlight OK
- [ ] Privacy policy URL pública publicada
- [ ] Screenshots listos (Android + iOS)
- [ ] Data safety / Privacy Nutrition Labels completos

## Día D

### Play Console
1. Production → Create new release
2. Subir mismo AAB (o el aprobado en internal)
3. Review release → **Start rollout to Production** (o guardar y publicar el día que Apple apruebe)

### App Store Connect
1. Versión → seleccionar build TestFlight
2. Completar metadata + screenshots
3. **Add for Review** → **Submit to App Review**

### Coordinación
- Ideal: Submit Apple primero o el mismo día que Play.
- Play suele aprobar más rápido.
- Opción segura: dejar Play en “Ready to publish” / staged 0% hasta Approved de Apple, después 100%.

## Post-launch
- [ ] Verificar app en Play Store search
- [ ] Verificar app en App Store search / link
- [ ] Probar update path (versionCode / build number +1)
- [ ] Monitorear crashes (Play Vitals / Xcode Organizer)

## Rollback
- Play: halt rollout / previous release
- App Store: no se baja fácil; preparar hotfix build + expedited review si es crítico
