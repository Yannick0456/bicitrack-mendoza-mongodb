const yo = { type: "Point", coordinates: [-68.844, -32.889] };   // posicion del usuario (placeholder)

// R1. ¿Dónde empieza y termina cada ciclovía?
db.ciclovias.find({}, { nombre: 1, municipio: 1, "inicio.nombre": 1, "fin.nombre": 1, longitud_km: 1, _id: 0 })

// R2. Estaciones biciTRAN a menos de 1 km, con distancia y tarifa ($geoNear primero)
db.estaciones_bicitran.aggregate([
  { $geoNear: { near: yo, distanceField: "dist_m", maxDistance: 1000, spherical: true, query: { activa: true } } },
  { $project: { nombre: 1, dist_m: { $round: ["$dist_m", 0] }, "tarifa_resumen.viaje_60min": 1 } }
])

// R3. Lugares para dejar scooter cerca ($near en find)
db.zonas_estacionamiento.find({ vehiculos_permitidos: "scooter",
  ubicacion: { $near: { $geometry: yo, $maxDistance: 2000 } } })

// R4. Bicicletería más cercana que repare scooter/monopatín
db.bicicleterias.find({ servicios: { $in: ["scooter","monopatin"] },
  ubicacion: { $near: { $geometry: yo, $maxDistance: 5000 } } }).limit(1)

// R5. Cortes vigentes en un instante, con su motivo
const ahora = ISODate("2026-06-18T12:00:00-03:00");
db.cortes_calle.find({ fechaInicio: { $lte: ahora }, fechaFin: { $gte: ahora } },
  { calle: 1, tramo_desde: 1, tramo_hasta: 1, motivo: 1, tipo_restriccion: 1, _id: 0 })

// R6. Cortes por motivo y duración promedio ($group)
db.cortes_calle.aggregate([
  { $group: { _id: "$motivo", total: { $sum: 1 },
      horas_prom: { $avg: { $dateDiff: { startDate: "$fechaInicio", endDate: "$fechaFin", unit: "hour" } } } } },
  { $sort: { total: -1 } } ])

// R7. Cortes que cruzan una ciclovía (usa el trazado como $geometry)
const c = db.ciclovias.findOne({ nombre: "Av. General Paz" });
db.cortes_calle.find({ trazado: { $geoIntersects: { $geometry: c.trazado } } })

// R8. Panel en una sola consulta ($geoNear + $facet)
db.estaciones_bicitran.aggregate([
  { $geoNear: { near: yo, distanceField: "dist_m", maxDistance: 2000, spherical: true } },
  { $facet: { cercanas: [ { $limit: 5 }, { $project: { nombre: 1, dist_m: 1 } } ],
              resumen:  [ { $group: { _id: null, estaciones: { $sum: 1 } } } ] } } ])

// R9. Pump tracks a menos de 10 km y sus datos
db.pump_tracks.find({ ubicacion: { $near: { $geometry: yo, $maxDistance: 10000 } } },
  { nombre: 1, superficie: 1, longitud_m: 1, acceso: 1 })

// R10. Control de calidad de datos: qué falta verificar (muy útil en la defensa)
db.ciclovias.aggregate([{ $group: { _id: "$calidad_dato", n: { $sum: 1 } } }])
db.estaciones_bicitran.countDocuments({ "coordenadas.estado": "placeholder_no_verificado" })
