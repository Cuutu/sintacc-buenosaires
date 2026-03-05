/**
 * Metadata SEO extendida por ciudad para páginas vacías (sin lugares en DB).
 * Usado por EmptyCityPage para contenido rankeable.
 */
export interface CiudadSEOData {
  nombre: string
  provincia: string
  descripcion: string
  poblacion: string
  zonasTipicas: string[]
}

export const ciudadesData: Record<string, CiudadSEOData> = {
  "buenos-aires": {
    nombre: "Buenos Aires",
    provincia: "CABA",
    descripcion:
      "Buenos Aires es la capital de Argentina y una de las ciudades con mayor oferta gastronómica sin gluten de Latinoamérica. Si sos celíaco y vivís o visitás Buenos Aires, Celimap te ayuda a encontrar restaurantes, panaderías, cafés y dietéticas aptas sin TACC en cada barrio, desde Palermo hasta La Boca.",
    poblacion: "~3 millones en CABA, ~15 millones en el AMBA",
    zonasTipicas: ["Palermo", "Recoleta", "San Telmo", "Belgrano", "Villa Crespo", "Caballito"],
  },
  cordoba: {
    nombre: "Córdoba",
    provincia: "Córdoba",
    descripcion:
      "Córdoba tiene una de las comunidades celíacas más organizadas del país. La ciudad cuenta con panaderías, restaurantes y almacenes especializados en productos sin TACC distribuidos en todos sus barrios. Este mapa colaborativo reúne las opciones verificadas por la comunidad celíaca cordobesa.",
    poblacion: "~1.5 millones de habitantes",
    zonasTipicas: ["Nueva Córdoba", "General Paz", "Cerro", "Villa Belgrano", "Argüello", "Centro"],
  },
  rosario: {
    nombre: "Rosario",
    provincia: "Santa Fe",
    descripcion:
      "Rosario es la tercera ciudad más grande de Argentina y cuenta con una comunidad celíaca activa. Si sos celíaco y vivís o visitás Rosario, este mapa colaborativo te ayuda a encontrar opciones seguras sin TACC en el centro, Pichincha, Fisherton y todos los barrios.",
    poblacion: "~1.2 millones de habitantes",
    zonasTipicas: ["Centro", "Pichincha", "Fisherton", "Echesortu", "Belgrano"],
  },
  mendoza: {
    nombre: "Mendoza",
    provincia: "Mendoza",
    descripcion:
      "Mendoza combina su tradición vitivinícola con una creciente oferta gastronómica apta para celíacos. Encontrá opciones sin TACC en el centro y en los departamentos del Gran Mendoza: Godoy Cruz, Guaymallén, Las Heras y Maipú.",
    poblacion: "~1.1 millones de habitantes",
    zonasTipicas: ["Ciudad", "Godoy Cruz", "Guaymallén", "Las Heras", "Maipú", "Chacras de Coria"],
  },
  "la-plata": {
    nombre: "La Plata",
    provincia: "Buenos Aires",
    descripcion:
      "La Plata es la capital de la provincia de Buenos Aires y sede de varias universidades. La comunidad celíaca platense crece año a año. En este mapa encontrás restaurantes, panaderías y dietéticas sin gluten en el casco urbano, Gonnet, City Bell y zonas aledañas.",
    poblacion: "~700 mil habitantes",
    zonasTipicas: ["Centro", "Gonnet", "City Bell", "Tolosa", "Ringuelet"],
  },
  "mar-del-plata": {
    nombre: "Mar del Plata",
    provincia: "Buenos Aires",
    descripcion:
      "Mar del Plata es el principal destino turístico de Argentina. Si sos celíaco y vas de vacaciones, Celimap te ayuda a encontrar dónde comer sin TACC en La Perla, Playa Grande, el centro y todos los barrios. Restaurantes, heladerías y panaderías aptas para celíacos.",
    poblacion: "~620 mil habitantes",
    zonasTipicas: ["Centro", "La Perla", "Playa Grande", "Bristol", "Güemes"],
  },
  "san-miguel-de-tucuman": {
    nombre: "San Miguel de Tucumán",
    provincia: "Tucumán",
    descripcion:
      "San Miguel de Tucumán es el corazón del Norte argentino. La comunidad celíaca tucumana está en crecimiento y cada vez hay más opciones sin TACC. Encontrá restaurantes, panaderías y dietéticas aptas en el centro, Yerba Buena y alrededores.",
    poblacion: "~548 mil habitantes",
    zonasTipicas: ["Centro", "Yerba Buena", "Banda del Río Salí"],
  },
  salta: {
    nombre: "Salta",
    provincia: "Salta",
    descripcion:
      "Salta la Linda atrae turistas de todo el mundo. Si sos celíaco y visitás o vivís en Salta, este mapa colaborativo te ayuda a encontrar opciones sin TACC en el centro colonial, Villa San Lorenzo y zonas aledañas.",
    poblacion: "~520 mil habitantes",
    zonasTipicas: ["Centro", "Balmaceda", "Villa San Lorenzo", "Cerrito"],
  },
  "santa-fe": {
    nombre: "Santa Fe",
    provincia: "Santa Fe",
    descripcion:
      "Santa Fe es la capital provincial y tiene una oferta gastronómica en expansión. La comunidad celíaca santafesina comparte sus lugares recomendados en este mapa. Encontrá opciones sin TACC en el centro, la Costanera y barrios cercanos.",
    poblacion: "~391 mil habitantes",
    zonasTipicas: ["Centro", "Costanera Este", "Sauce Viejo", "Recreo"],
  },
  "san-juan": {
    nombre: "San Juan",
    provincia: "San Juan",
    descripcion:
      "San Juan combina tradición vitivinícola con una ciudad en reconstrucción tras el sismo. La oferta sin gluten crece. Encontrá restaurantes, panaderías y dietéticas aptas para celíacos en el centro, Rawson, Rivadavia y el Gran San Juan.",
    poblacion: "~471 mil habitantes",
    zonasTipicas: ["Centro", "Rawson", "Rivadavia", "Chimbas", "Santa Lucía"],
  },
  resistencia: {
    nombre: "Resistencia",
    provincia: "Chaco",
    descripcion:
      "Resistencia es la capital del Chaco y puerta de entrada al Impenetrable. La comunidad celíaca chaqueña comparte sus lugares sin TACC en este mapa colaborativo. Encontrá opciones en el centro y barrios como Barranqueras.",
    poblacion: "~290 mil habitantes",
    zonasTipicas: ["Centro", "Barranqueras", "Fontana"],
  },
  neuquen: {
    nombre: "Neuquén",
    provincia: "Neuquén",
    descripcion:
      "Neuquén es la capital de la Patagonia norte. Con una economía petrolera y frutícola en crecimiento, la oferta gastronómica sin gluten se expande. Encontrá restaurantes y dietéticas aptas en el centro, Centenario y el Alto Valle.",
    poblacion: "~231 mil habitantes",
    zonasTipicas: ["Centro", "Centenario", "Confluencia"],
  },
  corrientes: {
    nombre: "Corrientes",
    provincia: "Corrientes",
    descripcion:
      "Corrientes es una ciudad con fuerte identidad guaraní. La comunidad celíaca correntina comparte sus lugares recomendados en este mapa. Encontrá opciones sin TACC en el centro, Camba Cuá y junto al río Paraná.",
    poblacion: "~346 mil habitantes",
    zonasTipicas: ["Centro", "Camba Cuá", "Costanera"],
  },
  parana: {
    nombre: "Paraná",
    provincia: "Entre Ríos",
    descripcion:
      "Paraná es la capital entrerriana y hermana de Santa Fe. La Costanera y el centro ofrecen opciones gastronómicas en crecimiento. Este mapa colaborativo reúne los lugares sin TACC verificados por la comunidad celíaca.",
    poblacion: "~247 mil habitantes",
    zonasTipicas: ["Centro", "Costanera", "Alberdi"],
  },
  "bahia-blanca": {
    nombre: "Bahía Blanca",
    provincia: "Buenos Aires",
    descripcion:
      "Bahía Blanca es el principal puerto del sur bonaerense. La comunidad celíaca bahiense comparte sus lugares sin TACC en este mapa. Encontrá opciones en el centro, Ingeniero White y barrios aledaños.",
    poblacion: "~301 mil habitantes",
    zonasTipicas: ["Centro", "Ingeniero White", "Villa Harding Green"],
  },
  "san-luis": {
    nombre: "San Luis",
    provincia: "San Luis",
    descripcion:
      "San Luis es la capital de la provincia homónima. Con una economía en crecimiento, la oferta gastronómica sin gluten se expande. Encontrá opciones sin TACC en el centro y La Punta.",
    poblacion: "~169 mil habitantes",
    zonasTipicas: ["Centro", "La Punta", "Juana Koslay"],
  },
  "rio-cuarto": {
    nombre: "Río Cuarto",
    provincia: "Córdoba",
    descripcion:
      "Río Cuarto es la segunda ciudad de Córdoba. La comunidad celíaca local comparte sus lugares recomendados en este mapa. Encontrá restaurantes y panaderías sin TACC en el centro y barrios.",
    poblacion: "~157 mil habitantes",
    zonasTipicas: ["Centro", "Jardín", "Güemes"],
  },
  "comodoro-rivadavia": {
    nombre: "Comodoro Rivadavia",
    provincia: "Chubut",
    descripcion:
      "Comodoro Rivadavia es el corazón petrolero de la Patagonia. La comunidad celíaca comodorense comparte sus lugares sin TACC en este mapa. Encontrá opciones en el centro y barrios petroleros.",
    poblacion: "~177 mil habitantes",
    zonasTipicas: ["Centro", "KM 3", "KM 5", "Restinga Alí"],
  },
  tandil: {
    nombre: "Tandil",
    provincia: "Buenos Aires",
    descripcion:
      "Tandil es destino turístico y universitario. La comunidad celíaca tandilense comparte sus lugares recomendados. Encontrá restaurantes, panaderías y dietéticas sin TACC en el centro y zonas aledañas.",
    poblacion: "~130 mil habitantes",
    zonasTipicas: ["Centro", "Gardey", "La Movediza"],
  },
  ushuaia: {
    nombre: "Ushuaia",
    provincia: "Tierra del Fuego",
    descripcion:
      "Ushuaia, la ciudad del fin del mundo, atrae turistas de todo el planeta. Si sos celíaco y visitás Ushuaia, este mapa colaborativo te ayuda a encontrar opciones sin TACC en el centro y barrios.",
    poblacion: "~57 mil habitantes",
    zonasTipicas: ["Centro", "Andorra", "Bahía Golondrina"],
  },
}

export function getCiudadSEOData(citySlug: string): CiudadSEOData | undefined {
  return ciudadesData[citySlug]
}
