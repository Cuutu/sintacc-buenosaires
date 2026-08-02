# Prerequisitos store — checklist

Privacy URL pública (bloqueador #1 de stores):

**https://www.celimap.com.ar/privacidad**

(Disponible en el repo en `/privacidad`. Hay que **deployar a producción** para que Apple/Play la acepten.)

---

## Hecho en código

- [x] Página `/privacidad` (contenido + SEO + sitemap + footer)
- [x] Copy listing Play/App Store con URL de privacidad (`LISTING-COPY.md`)
- [x] Shell Capacitor Android + iOS + `codemagic.yaml`
- [x] Templates deep links (`well-known-templates.md`)

## Pendiente de tu lado (cuentas / assets)

### Legal / soporte
- [ ] Deploy web a Vercel → verificar que abre `/privacidad`
- [ ] Confirmar que `hola@celimap.com.ar` existe o cambiar el mail en la página
- [ ] (Opcional) Publicar `.well-known` con Team ID + SHA256 reales

### Apple (Developer ya lo tenés)
- [ ] App ID `com.celimap.app` en developer.apple.com
- [ ] App Store Connect → crear app Celimap
- [ ] Anotar Apple ID numérico → pegar en `codemagic.yaml` (`APP_STORE_APPLE_ID`)
- [ ] Codemagic: repo + integration App Store Connect + credentials
- [ ] Screenshots iPhone 6.7" y 6.5" (mínimo)
- [ ] Privacy Nutrition Labels (ver sección Data abajo)
- [ ] Correr workflow `ios-testflight`

### Android
- [ ] Play Console (USD 25)
- [ ] `npm run android:keystore` + backup offline
- [ ] AAB release → Internal testing
- [ ] Feature graphic 1024×500 + screenshots teléfono
- [ ] Data safety form

### Data / Privacy labels (ambos stores)

Declarar recolección:

| Dato | Origen | Uso |
|------|--------|-----|
| Email / nombre / foto perfil | Google OAuth | Cuenta |
| Ubicación (precisa/aproximada) | Permiso opcional | Cerca mío / mapa |
| Contenido de usuario | Reseñas, sugerencias, listas | Funcionalidad |
| Identificadores / diagnósticos | Hosting / analytics | Operación |

- No se venden datos a terceros
- Ubicación: solo con permiso, no tracking continuo en background

---

## Orden sugerido ahora

1. Deploy web (para que `/privacidad` esté live)
2. Crear app en App Store Connect + App ID
3. Configurar Codemagic → TestFlight
4. En paralelo: keystore + Internal testing Android
