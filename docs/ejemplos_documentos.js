// ciclovias: inicio y fin verificados en prensa, trazado placeholder
{
  nombre: "Av. General Paz (Las Heras)", municipio: "Las Heras",
  inicio: { nombre: "Independencia", punto: { type:"Point", coordinates:[-68.84,-32.89] } },
  fin:    { nombre: "Aristóbulo del Valle", punto: { type:"Point", coordinates:[-68.83,-32.88] } },
  trazado: { type:"LineString", coordinates:[[-68.84,-32.89],[-68.83,-32.88]] },
  tipo: "segregada_hormigon", tipo_calidad: "inferido", longitud_km: 4, longitud_calidad: "aproximado (>4 km)",
  estado: "existente_2022", coordenadas: { estado: "placeholder_no_verificado" },
  calidad_dato: "verificado_parcial", fuente: "https://www.losandes.com.ar/politica/sigue-la-construccion-de-ciclovias-en-el-gran-mendoza-donde-estan-ubicados-los-nuevos-tramos"
}

// cortes_calle
{
  calle: "Boulogne Sur Mer", tramo_desde: "Sargento Cabral", tramo_hasta: "Arístides Villanueva",
  tipo_restriccion: "un_carril", motivo: "reparacion_pavimento",
  fechaInicio: ISODate("2026-06-18T10:00:00Z"), fechaFin: ISODate("2026-06-18T23:59:59Z"),
  expiraEn: ISODate("2026-07-18T00:00:00Z"), desvio: null,
  trazado: { type:"LineString", coordinates:[[-68.84,-32.89],[-68.838,-32.888]] },
  coordenadas: { estado: "placeholder_no_verificado" }, calidad_dato: "verificado_texto",
  fuente: "https://www.sitioandino.com.ar/servicios/transito-ciudad-mendoza-cortes-calles-y-desvios-este-18-junio-n5725002"
}

// bicicleterias
{
  nombre: "E-Bikes Argentina", servicios: ["ebike","baterias","diagnostico_electrico"],
  horario: ["L-V 10:00-18:00","S 10:00-14:00"], direccion: null,
  ubicacion: { type:"Point", coordinates:[-68.84,-32.89] }, coordenadas: { estado: "placeholder_no_verificado" },
  calidad_dato: "verificado_parcial", fuente: "https://e-bikesargentina.com/sobre-nosotros-ebiks-argentina-mendoza/"
}
