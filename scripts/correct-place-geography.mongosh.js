/**
 * CORRECCION GEOGRAFICA de province/locality en Atlas.
 * Calle/avenida/barrio NUNCA determinan province/locality.
 * Solo: overrides por _id, componentes estructurados, tabla explicita de localidades.
 * DRY-RUN por defecto. Para escribir: const WRITE_MODE = true.
 */

const WRITE_MODE = false;
const COLLECTION = "places";

var OVERRIDES = {
  "69aa251158ac835acbeadbe8": { province: "buenos-aires", locality: "mar-del-plata" },
  "69aa251158ac835acbeadb67": { province: "buenos-aires", locality: "olivos" },
  "69aa251158ac835acbeadbc0": { province: "buenos-aires", locality: "martinez" },
  "69aa251158ac835acbeadb6e": { province: "buenos-aires", locality: "ingeniero-maschwitz" },
  "69aa251158ac835acbeadbc6": { province: "caba", locality: "buenos-aires" },
  "69aa251158ac835acbeadc74": { province: "buenos-aires", locality: "martinez" },
  "69a980c5debe71f1c8464436": { province: "cordoba", locality: "cordoba" },
  "6a0f1ec6ca52e17e662ed162": { province: "tucuman", locality: "yerba-buena" },
  "6a0f1eb2ca52e17e662ed15b": { province: "tucuman", locality: "yerba-buena" },
  "6a5e929453c9854856a22ef0": { province: "santiago-del-estero", locality: "santiago-del-estero" },
  "6a5d8c69f87ac850cf8ef59a": { province: "santiago-del-estero", locality: "santiago-del-estero" },
  "6a5d8bd7f87ac850cf8ef58e": { province: "santiago-del-estero", locality: "santiago-del-estero" },
  "6a5e925e9efaf990c479bb82": { province: "santa-cruz", locality: "rio-gallegos" },
  "6a204ccdac3e8070985795e5": { province: "la-pampa", locality: "general-pico" },
  "6a204c93ac3e8070985795d6": { province: "la-pampa", locality: "general-pico" },
  "6a204c05ac3e8070985795bd": { province: "la-pampa", locality: "general-pico" },
  "6a204b747e44b32cde8a847f": { province: "la-pampa", locality: "general-pico" },
  "6a1ba6a689ca2919dc5fb7b4": { province: "chubut", locality: "puerto-madryn" },
  "6a159cadd0205b2ade6b0e99": { province: "santiago-del-estero", locality: "santiago-del-estero" },
  "69f436b76c637fd4883f5bf1": { province: "la-rioja", locality: "villa-union" }
};

var KNOWN_LOCALITIES = {
  "yerba-buena": "tucuman", "olivos": "buenos-aires", "martinez": "buenos-aires",
  "ingeniero-maschwitz": "buenos-aires", "general-pico": "la-pampa", "puerto-madryn": "chubut",
  "santiago-del-estero": "santiago-del-estero", "rio-gallegos": "santa-cruz", "villa-union": "la-rioja",
  "buenos-aires": "caba", "la-plata": "buenos-aires", "mar-del-plata": "buenos-aires",
  "cordoba": "cordoba", "rosario": "santa-fe", "mendoza": "mendoza",
  "san-miguel-de-tucuman": "tucuman", "salta": "salta", "santa-fe": "santa-fe",
  "san-juan": "san-juan", "resistencia": "chaco", "neuquen": "neuquen",
  "corrientes": "corrientes", "parana": "entre-rios", "bahia-blanca": "buenos-aires",
  "san-luis": "san-luis", "rio-cuarto": "cordoba", "comodoro-rivadavia": "chubut",
  "tandil": "buenos-aires", "ushuaia": "tierra-del-fuego"
};

// Capitales que tambien son provincia: como segmento generico representan provincia, NO localidad.
var AMBIGUOUS_CAPITALS = ["buenos-aires", "cordoba", "mendoza", "salta", "santa-fe", "san-juan", "san-luis", "resistencia", "neuquen", "corrientes", "parana", "santiago-del-estero", "rio-gallegos"];

var STREET_PREFIXES = ["av", "avenida", "calle", "pasaje", "bulevar", "boulevard", "ruta", "camino", "autopista", "gral", "general", "dr", "doctor", "sargento", "teniente", "coronel", "pr", "presidente", "cnl", "tcnl"];

function norm(v) { if (!v) return ""; return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function isStreet(t) { var x = norm(t); if (!x) return false; for (var i = 0; i < STREET_PREFIXES.length; i++) { if (x.indexOf(STREET_PREFIXES[i] + " ") === 0 || x === STREET_PREFIXES[i]) return true; } return false; }
function isAmbiguousCapital(slug) { return AMBIGUOUS_CAPITALS.indexOf(slug) !== -1; }

/** Localidad SOLO si es segmento independiente, sin numero de altura, no calle/avenida, no capital ambigua. */
function localityStrict(address) {
  if (!address) return undefined;
  var segs = String(address).split(",").map(function (s) { return norm(s); }).filter(Boolean);
  for (var i = 0; i < segs.length; i++) {
    var c = segs[i].replace(/^\d+\s*/, "").trim();
    if (!c || isStreet(c)) continue;
    if (/\d/.test(c)) continue;
    for (var slug in KNOWN_LOCALITIES) {
      if (c === norm(slug.replace(/-/g, " ")) && !isAmbiguousCapital(slug)) return slug;
    }
  }
  return undefined;
}

/** Provincia SOLO desde componente estructurado explicito ("Provincia de X"). */
function provinceStructured(t) {
  if (!t) return undefined;
  var n = norm(t);
  var provs = { "buenos aires": "buenos-aires", "cordoba": "cordoba", "tucuman": "tucuman", "santa fe": "santa-fe", "mendoza": "mendoza", "salta": "salta", "santa cruz": "santa-cruz", "chaco": "chaco", "chubut": "chubut", "la pampa": "la-pampa", "la rioja": "la-rioja", "corrientes": "corrientes", "entre rios": "entre-rios", "san luis": "san-luis", "san juan": "san-juan", "santiago del estero": "santiago-del-estero", "tierra del fuego": "tierra-del-fuego", "neuquen": "neuquen", "rio negro": "rio-negro", "formosa": "formosa", "jujuy": "jujuy", "misiones": "misiones", "catamarca": "catamarca" };
  for (var p in provs) { if (n.indexOf("provincia de " + p) !== -1) return provs[p]; }
  if (n.indexOf("ciudad autonoma") !== -1 || n.indexOf("cdad") !== -1 || n.indexOf("capital federal") !== -1) return "caba";
  return undefined;
}

function main() {
  print("Base: " + db.getName() + " | Coleccion: " + COLLECTION + " | Modo: " + (WRITE_MODE ? "ESCRITURA" : "DRY-RUN"));
  var coll = db.getCollection(COLLECTION);
  var places = coll.find({}).toArray();
  print("Total: " + places.length);

  var pbaGeneric = [];
  var updates = [];
  var overrideApplied = 0;

  for (var k = 0; k < places.length; k++) {
    var p = places[k]; var id = p._id.toString(); var province = p.province; var locality = p.locality;

    if (OVERRIDES[id]) {
      var ov = OVERRIDES[id];
      var cp = ov.province !== province, cl = ov.locality !== locality;
      if (cp || cl) { overrideApplied += 1; var set = {}; if (cp) set.province = ov.province; if (cl) set.locality = ov.locality; updates.push({ _id: p._id, name: p.name, set: set }); }
      continue;
    }

    if (!locality) { var l = localityStrict(p.address || ""); if (l) locality = l; }
    if (!province) { var pr = provinceStructured(p.addressText || ""); if (pr) province = pr; }
    if (!province && locality && KNOWN_LOCALITIES[locality]) province = KNOWN_LOCALITIES[locality];

    if (province === "buenos-aires" && locality === "buenos-aires") {
      pbaGeneric.push({ _id: id, name: p.name, address: p.address || "", neighborhood: p.neighborhood || "", addressText: p.addressText || "" });
    }

    if (province !== p.province || locality !== p.locality) {
      var s2 = {}; if (province && province !== p.province) s2.province = province; if (locality && locality !== p.locality) s2.locality = locality;
      if (Object.keys(s2).length > 0) updates.push({ _id: p._id, name: p.name, set: s2 });
    }
  }

  print("\n═══════ REPORTE ═══════");
  print("Total analizados: " + places.length);
  print("Overrides aplicados: " + overrideApplied);
  print("Cambios propuestos: " + updates.length);
  print("\n── Cambios propuestos ──");
  for (var u = 0; u < updates.length; u++) print("  · " + updates[u].name + " (" + updates[u]._id + ") → " + JSON.stringify(updates[u].set));

  print("\n── PBA genericos (province=buenos-aires, locality=buenos-aires) ──");
  print("Total: " + pbaGeneric.length);
  for (var i = 0; i < Math.min(20, pbaGeneric.length); i++) { var g = pbaGeneric[i]; print("  · " + g.name + " | barrio: " + g.neighborhood + " | dir: " + g.address); }
  if (pbaGeneric.length > 20) print("  … y " + (pbaGeneric.length - 20) + " mas");

  if (!WRITE_MODE) { print("\nDRY-RUN: no se escribio. Revisa y cambia WRITE_MODE a true solo para aplicar."); return; }
  print("\nEscribiendo " + updates.length + "...");
  for (var w = 0; w < updates.length; w++) coll.updateOne({ _id: updates[w]._id }, { $set: updates[w].set });
  print("Correccion completada.");
}

main();