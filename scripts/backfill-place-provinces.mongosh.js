/**
 * Backfill de campos geograficos normalizados (province / locality) para MongoDB Atlas.
 *
 * 1) Selecciona la base de datos correcta en el dropdown de Atlas (la que tenga "places").
 * 2) Pega TODO y ejecuta. Con WRITE_MODE = false hace DRY-RUN (no escribe).
 * 3) Revisa el reporte. Si es correcto, cambia WRITE_MODE a true y vuelve a ejecutar.
 */

const WRITE_MODE = false; // <<< CAMBIA A true SOLO DESPUES DE REVISAR EL REPORTE
const COLLECTION = "places";

var PROVINCES = [
  { name: "Buenos Aires", slug: "buenos-aires", aliases: ["Provincia de Buenos Aires", "PBA", "Buenos Aires Province"] },
  { name: "Ciudad Autonoma de Buenos Aires", slug: "caba", aliases: ["CABA", "Capital Federal", "Buenos Aires Ciudad", "Ciudad de Buenos Aires"] },
  { name: "Catamarca", slug: "catamarca", aliases: ["Provincia de Catamarca"] },
  { name: "Chaco", slug: "chaco", aliases: ["Provincia del Chaco"] },
  { name: "Chubut", slug: "chubut", aliases: ["Provincia del Chubut"] },
  { name: "Cordoba", slug: "cordoba", aliases: ["Provincia de Cordoba"] },
  { name: "Corrientes", slug: "corrientes", aliases: ["Provincia de Corrientes"] },
  { name: "Entre Rios", slug: "entre-rios", aliases: ["Provincia de Entre Rios"] },
  { name: "Formosa", slug: "formosa", aliases: ["Provincia de Formosa"] },
  { name: "Jujuy", slug: "jujuy", aliases: ["Provincia de Jujuy"] },
  { name: "La Pampa", slug: "la-pampa", aliases: ["Provincia de La Pampa"] },
  { name: "La Rioja", slug: "la-rioja", aliases: ["Provincia de La Rioja"] },
  { name: "Mendoza", slug: "mendoza", aliases: ["Provincia de Mendoza"] },
  { name: "Misiones", slug: "misiones", aliases: ["Provincia de Misiones"] },
  { name: "Neuquen", slug: "neuquen", aliases: ["Provincia del Neuquen"] },
  { name: "Rio Negro", slug: "rio-negro", aliases: ["Provincia de Rio Negro"] },
  { name: "Salta", slug: "salta", aliases: ["Provincia de Salta"] },
  { name: "San Juan", slug: "san-juan", aliases: ["Provincia de San Juan"] },
  { name: "San Luis", slug: "san-luis", aliases: ["Provincia de San Luis"] },
  { name: "Santa Cruz", slug: "santa-cruz", aliases: ["Provincia de Santa Cruz"] },
  { name: "Santa Fe", slug: "santa-fe", aliases: ["Provincia de Santa Fe"] },
  { name: "Santiago del Estero", slug: "santiago-del-estero", aliases: ["Provincia de Santiago del Estero"] },
  { name: "Tierra del Fuego", slug: "tierra-del-fuego", aliases: ["Provincia de Tierra del Fuego", "Tierra del Fuego, Antartida e Islas del Atlantico Sur"] },
  { name: "Tucuman", slug: "tucuman", aliases: ["Provincia de Tucuman", "Tucuman"] }
];

var CITIES = [
  { slug: "buenos-aires", name: "Buenos Aires", provinceSlug: "caba", neighborhoods: ["Palermo", "Recoleta", "San Telmo", "Puerto Madero", "Belgrano", "Villa Crespo", "Caballito", "Almagro", "Villa Urquiza", "Colegiales", "Balvanera", "Monserrat", "La Boca", "Barracas", "Boedo", "Constitucion", "Retiro", "Parque Chacabuco", "Nunez", "Saavedra"] },
  { slug: "cordoba", name: "Cordoba", provinceSlug: "cordoba", neighborhoods: ["Cordoba", "Nueva Cordoba", "Centro", "Alta Cordoba", "Guemes", "Villa Carlos Paz"] },
  { slug: "rosario", name: "Rosario", provinceSlug: "santa-fe", neighborhoods: ["Rosario", "Centro", "Pichincha", "Echesortu", "Fisherton"] },
  { slug: "mendoza", name: "Mendoza", provinceSlug: "mendoza", neighborhoods: ["Mendoza", "Centro", "Chacras de Coria", "Godoy Cruz", "Lujan de Cuyo"] },
  { slug: "la-plata", name: "La Plata", provinceSlug: "buenos-aires", neighborhoods: ["La Plata", "Centro", "Gonnet", "City Bell", "Tolosa"] },
  { slug: "mar-del-plata", name: "Mar del Plata", provinceSlug: "buenos-aires", neighborhoods: ["Mar del Plata", "Centro", "La Perla", "Playa Grande", "Bristol"] },
  { slug: "san-miguel-de-tucuman", name: "San Miguel de Tucuman", provinceSlug: "tucuman", neighborhoods: ["San Miguel de Tucuman", "Centro", "Yerba Buena"] },
  { slug: "salta", name: "Salta", provinceSlug: "salta", neighborhoods: ["Salta", "Centro", "Balmaceda", "Villa San Lorenzo"] },
  { slug: "santa-fe", name: "Santa Fe", provinceSlug: "santa-fe", neighborhoods: ["Santa Fe", "Centro", "Costanera Este", "Sauce Viejo"] },
  { slug: "san-juan", name: "San Juan", provinceSlug: "san-juan", neighborhoods: ["San Juan", "Centro", "Rawson", "Rivadavia"] },
  { slug: "resistencia", name: "Resistencia", provinceSlug: "chaco", neighborhoods: ["Resistencia", "Centro", "Barranqueras"] },
  { slug: "neuquen", name: "Neuquen", provinceSlug: "neuquen", neighborhoods: ["Neuquen", "Centro", "Centenario"] },
  { slug: "corrientes", name: "Corrientes", provinceSlug: "corrientes", neighborhoods: ["Corrientes", "Centro", "Camba Cua"] },
  { slug: "parana", name: "Parana", provinceSlug: "entre-rios", neighborhoods: ["Parana", "Centro", "Costanera"] },
  { slug: "bahia-blanca", name: "Bahia Blanca", provinceSlug: "buenos-aires", neighborhoods: ["Bahia Blanca", "Centro", "Ingeniero White"] },
  { slug: "san-luis", name: "San Luis", provinceSlug: "san-luis", neighborhoods: ["San Luis", "Centro", "La Punta"] },
  { slug: "rio-cuarto", name: "Rio Cuarto", provinceSlug: "cordoba", neighborhoods: ["Rio Cuarto", "Centro"] },
  { slug: "comodoro-rivadavia", name: "Comodoro Rivadavia", provinceSlug: "chubut", neighborhoods: ["Comodoro Rivadavia", "Centro"] },
  { slug: "tandil", name: "Tandil", provinceSlug: "buenos-aires", neighborhoods: ["Tandil", "Centro", "Gardey"] },
  { slug: "ushuaia", name: "Ushuaia", provinceSlug: "tierra-del-fuego", neighborhoods: ["Ushuaia", "Centro", "Andorra"] }
];

var AMBIGUOUS_BA = "buenos aires";

function norm(v) { if (!v) return ""; return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function byName(name) { var n = norm(name); if (!n || n === AMBIGUOUS_BA) return undefined; return PROVINCES.find(function (p) { return norm(p.name) === n; }); }
function byAlias(alias) { var n = norm(alias); if (!n || n === AMBIGUOUS_BA) return undefined; return PROVINCES.find(function (p) { return p.aliases.some(function (a) { return norm(a) === n; }); }); }
function provinceFromStructured(addressText) {
  if (!addressText || !String(addressText).trim()) return undefined;
  var n = norm(addressText);
  for (var i = 0; i < PROVINCES.length; i++) { var pn = norm(PROVINCES[i].name); if (n.indexOf("provincia de " + pn) !== -1 || n.indexOf(pn + " province") !== -1) return PROVINCES[i].slug; }
  if (n.indexOf("provincia de buenos aires") !== -1) return "buenos-aires";
  if (n.indexOf("caba") !== -1 || n.indexOf("capital federal") !== -1 || n.indexOf("ciudad autonoma de buenos aires") !== -1) return "caba";
  return undefined;
}
function provinceFromAddress(address) {
  var n = norm(address); if (!n) return undefined;
  for (var i = 0; i < PROVINCES.length; i++) { var pn = norm(PROVINCES[i].name); if (n.indexOf("provincia de " + pn) !== -1 || n.indexOf(pn + " province") !== -1) return PROVINCES[i].slug; }
  var segments = n.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var last = segments[segments.length - 1];
  if (last) { if (last === AMBIGUOUS_BA) return undefined; var bn = byName(last); if (bn) return bn.slug; var ba = byAlias(last); if (ba) return ba.slug; }
  return undefined;
}
/** Resuelve provincia desde el codigo postal de CABA (C#### o ####), inequivoco. */
function provinceFromPostalCode(address) {
  if (!address) return undefined;
  var n = norm(address);
  if (n.indexOf("buenos aires") === -1) return undefined;
  if (n.indexOf("provincia de buenos aires") !== -1) return undefined;
  if (/\bc\d{4}\b/.test(n) || /\b\d{4}\b/.test(n) || n.indexOf("cdad") !== -1) return "caba";
  return undefined;
}
/** Resuelve provincia desde el neighborhood. Solo si el barrio pertenece a UNA unica provincia (evita "Centro"). */
function provinceFromNeighborhood(neighborhood) {
  if (!neighborhood) return undefined;
  var n = norm(neighborhood);
  var matches = [];
  for (var i = 0; i < CITIES.length; i++) {
    for (var j = 0; j < CITIES[i].neighborhoods.length; j++) {
      if (n === norm(CITIES[i].neighborhoods[j])) matches.push(CITIES[i].provinceSlug);
    }
  }
  var unique = matches.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
  if (unique.length === 1) return unique[0];
  return undefined;
}
function localityFromText(text) {
  var n = norm(text); if (!n) return undefined;
  for (var i = 0; i < CITIES.length; i++) { var c = CITIES[i]; if (n.indexOf(norm(c.name)) !== -1 || n.indexOf(c.slug.replace(/-/g, " ")) !== -1) return c.slug; for (var j = 0; j < c.neighborhoods.length; j++) { if (n === norm(c.neighborhoods[j])) return c.slug; } }
  return undefined;
}
function isAmbiguousBA(address, addressText) { var t = norm((address || "") + " " + (addressText || "")); if (t.indexOf("buenos aires") === -1) return false; if (t.indexOf("provincia de buenos aires") !== -1) return false; if (t.indexOf("caba") !== -1 || t.indexOf("capital federal") !== -1) return false; return true; }

function main() {
  print("Base: " + db.getName() + " | Coleccion: " + COLLECTION + " | Modo: " + (WRITE_MODE ? "ESCRITURA" : "DRY-RUN"));
  var coll = db.getCollection(COLLECTION);
  var places = coll.find({}).toArray();
  print("Total documentos: " + places.length);
  if (places.length === 0) { print("No hay documentos. Verifica que seleccionaste la base correcta en Atlas."); return; }

  var provinceCounts = {};
  var report = { provinceResolved: 0, provinceAmbiguous: 0, provinceNoData: 0, localityResolved: 0, localityPending: 0, ambiguous: [], samples: { caba: { resolved: 0, ambiguous: 0, sample: [] }, "buenos-aires": { resolved: 0, ambiguous: 0, sample: [] }, cordoba: { resolved: 0, ambiguous: 0, sample: [] }, tucuman: { resolved: 0, ambiguous: 0, sample: [] }, "mar-del-plata": { resolved: 0, ambiguous: 0, sample: [] }, "la-plata": { resolved: 0, ambiguous: 0, sample: [] } } };
  var updates = [];

  for (var k = 0; k < places.length; k++) {
    var place = places[k]; var id = place._id; var province = place.province; var locality = place.locality;

    // Normalizar province existente (puede ser nombre en vez de slug)
    if (province) {
      var pnx = byName(province);
      if (pnx) province = pnx.slug;
      else {
        var pax = byAlias(province);
        if (pax) province = pax.slug;
        else if (norm(province) === "buenos aires") province = "buenos-aires"; // campo ya asignado = PBA
      }
    }

    if (!province) {
      province = provinceFromStructured(place.addressText);
      if (!province) province = provinceFromAddress(place.address || "");
      if (!province) province = provinceFromNeighborhood(place.neighborhood || "");
      if (!province) province = provinceFromPostalCode((place.address || "") + " " + (place.addressText || ""));
      if (!province) { if (isAmbiguousBA(place.address, place.addressText)) { report.provinceAmbiguous += 1; report.ambiguous.push({ _id: id, name: place.name, address: place.address || "", reason: "Buenos Aires ambiguo (CABA vs PBA)" }); } else report.provinceNoData += 1; }
      else { report.provinceResolved += 1; provinceCounts[province] = (provinceCounts[province] || 0) + 1; }
    } else {
      provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    }
    if (!locality) {
      locality = localityFromText(place.neighborhood || "");
      if (!locality) locality = localityFromText(place.address || "");
      if (!locality) locality = localityFromText(place.addressText || "");
      if (locality) report.localityResolved += 1; else report.localityPending += 1;
    }
    var sampleKey = null;
    if (province) {
      if (locality === "la-plata" || locality === "mar-del-plata") sampleKey = locality;
      else sampleKey = province;
    } else if (isAmbiguousBA(place.address, place.addressText)) {
      sampleKey = "buenos-aires";
    }
    if (sampleKey && report.samples[sampleKey]) { var s = report.samples[sampleKey]; if (province) s.resolved += 1; else s.ambiguous += 1; if (s.sample.length < 5) s.sample.push(place.name + " (" + (place.neighborhood || "") + ")"); }
    if (province !== place.province || locality !== place.locality) { var set = {}; if (province && province !== place.province) set.province = province; if (locality && locality !== place.locality) set.locality = locality; if (Object.keys(set).length > 0) updates.push({ _id: id, set: set }); }
  }

  print("\n═══════ REPORTE ═══════");
  print("Total: " + places.length);
  print("Provincia resuelta: " + report.provinceResolved);
  print("Provincia ambigua: " + report.provinceAmbiguous);
  print("Provincia sin datos: " + report.provinceNoData);
  print("Localidad resuelta: " + report.localityResolved);
  print("Localidad pendiente: " + report.localityPending);
  print("A actualizar: " + updates.length);

  print("\n── Lugares por provincia ──");
  var totalProvincies = 0;
  for (var pc in provinceCounts) { print(pc + ": " + provinceCounts[pc]); totalProvincies += provinceCounts[pc]; }
  print("Total asignados: " + totalProvincies);

  print("\n── Muestras ──");
  for (var key in report.samples) { var s2 = report.samples[key]; print(key + ": resueltos=" + s2.resolved + ", ambiguos=" + s2.ambiguous); for (var m = 0; m < s2.sample.length; m++) print("  · " + s2.sample[m]); }
  if (report.ambiguous.length > 0) { print("\n── Ambiguos ──"); for (var a = 0; a < Math.min(20, report.ambiguous.length); a++) print("  · " + report.ambiguous[a].name + " (" + report.ambiguous[a].address + ") — " + report.ambiguous[a].reason); if (report.ambiguous.length > 20) print("  … y " + (report.ambiguous.length - 20) + " mas"); }
  if (!WRITE_MODE) { print("\nDRY-RUN: no se escribio. Revisa y cambia WRITE_MODE a true."); return; }
  if (updates.length === 0) { print("\nSin cambios."); return; }
  print("\nEscribiendo " + updates.length + "...");
  for (var u = 0; u < updates.length; u++) coll.updateOne({ _id: updates[u]._id }, { $set: updates[u].set });
  print("Backfill completado.");
}

main();