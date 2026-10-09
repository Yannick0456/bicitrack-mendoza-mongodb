// 02_consultas.js -- mongosh "mongodb://localhost:27017/bicitrack" scripts/02_consultas.js
// Requiere haber corrido 01_carga.js. Las coordenadas son PLACEHOLDER: las distancias no tienen significado real.
const show = (titulo, datos) => { print("\n=== " + titulo + " ==="); printjson(datos); };
const yo = { type: "Point", coordinates: [-68.844, -32.889] };   // posicion del usuario (placeholder)

// R1. Donde empieza y termina cada ciclovia
show("R1. Inicio y fin de cada ciclovia",
  db.ciclovias.find({}, { nombre: 1, municipio: 1, "inicio.nombre": 1, "fin.nombre": 1, longitud_km: 1, _id: 0 }).toArray());

// R2. Estaciones biciTRAN a menos de 1 km, con distancia y tarifa ($geoNear primero)
show("R2. Estaciones a menos de 1 km",
  db.estaciones_bicitran.aggregate([
    { $geoNear: { near: yo, distanceField: "dist_m", maxDistance: 1000, spherical: true, query: { activa: true } } },
    { $project: { nombre: 1, dist_m: { $round: ["$dist_m", 0] }, "tarifa_resumen.viaje_60min": 1 } }
  ]).toArray());

// R3. Lugares para dejar scooter cerca ($near en find)
show("R3. Zonas de estacionamiento para scooter a menos de 2 km",
  db.zonas_estacionamiento.find({ vehiculos_permitidos: "scooter",
    ubicacion: { $near: { $geometry: yo, $maxDistance: 2000 } } }, { nombre: 1, regla: 1, _id: 0 }).toArray());

// R4. Bicicleteria mas cercana que repare scooter/monopatin
show("R4. Bicicleteria mas cercana (scooter/monopatin)",
  db.bicicleterias.find({ servicios: { $in: ["scooter", "monopatin"] },
    ubicacion: { $near: { $geometry: yo, $maxDistance: 5000 } } }, { nombre: 1, servicios: 1, _id: 0 }).limit(1).toArray());

// R5. Cortes vigentes en un instante, con su motivo
const ahora = ISODate("2026-06-18T12:00:00-03:00");
show("R5. Cortes vigentes el 18/06/2026 12:00",
  db.cortes_calle.find({ fechaInicio: { $lte: ahora }, fechaFin: { $gte: ahora } },
    { calle: 1, tramo_desde: 1, tramo_hasta: 1, motivo: 1, tipo_restriccion: 1, _id: 0 }).toArray());

// R6. Cortes por motivo y duracion promedio ($group)
show("R6. Cortes por motivo y duracion promedio (horas)",
  db.cortes_calle.aggregate([
    { $group: { _id: "$motivo", total: { $sum: 1 },
        horas_prom: { $avg: { $dateDiff: { startDate: "$fechaInicio", endDate: "$fechaFin", unit: "hour" } } } } },
    { $sort: { total: -1 } }
  ]).toArray());

// R7. Cortes que cruzan una ciclovia (con coordenadas placeholder puede dar vacio: es esperable)
const c = db.ciclovias.findOne({ nombre: "Av. General Paz" });
show("R7. Cortes que intersectan Av. General Paz",
  db.cortes_calle.find({ trazado: { $geoIntersects: { $geometry: c.trazado } } }, { calle: 1, motivo: 1, _id: 0 }).toArray());

// R8. Panel en una sola consulta ($geoNear + $facet)
show("R8. Panel: estaciones cercanas y resumen",
  db.estaciones_bicitran.aggregate([
    { $geoNear: { near: yo, distanceField: "dist_m", maxDistance: 2000, spherical: true } },
    { $facet: { cercanas: [ { $limit: 5 }, { $project: { nombre: 1, dist_m: { $round: ["$dist_m", 0] }, _id: 0 } } ],
                resumen:  [ { $group: { _id: null, estaciones: { $sum: 1 } } } ] } }
  ]).toArray());

// R9. Pump tracks a menos de 10 km y sus datos
show("R9. Pump tracks a menos de 10 km",
  db.pump_tracks.find({ ubicacion: { $near: { $geometry: yo, $maxDistance: 10000 } } },
    { nombre: 1, superficie: 1, longitud_m: 1, acceso: 1, _id: 0 }).toArray());

// R10. Control de calidad de datos
show("R10a. Ciclovias por calidad de dato",
  db.ciclovias.aggregate([{ $group: { _id: "$calidad_dato", n: { $sum: 1 } } }]).toArray());
show("R10b. Estaciones con coordenadas sin verificar",
  db.estaciones_bicitran.countDocuments({ "coordenadas.estado": "placeholder_no_verificado" }));
