// carga.js -- mongosh bicitrack carga.js
// calidad_dato: V = texto verificado en fuente; A = aproximado/inferido; P = placeholder
// TODAS las coordenadas son PLACEHOLDER (sin verificar). Reemplazar por geocodificacion real.
const CENTRO = [-68.84, -32.89];
let _n = 0;
function ph() {                       // punto placeholder determinista (grilla ~ +-1 km)
  _n++;
  return { type: "Point", coordinates: [
    +(CENTRO[0] + ((_n * 37) % 21 - 10) * 0.001).toFixed(5),
    +(CENTRO[1] + ((_n * 53) % 21 - 10) * 0.001).toFixed(5) ] };
}
function linea() { const a = ph().coordinates, b = ph().coordinates;
  return { type: "LineString", coordinates: [a, b] }; }
const COORD = { estado: "placeholder_no_verificado" };
const F = {
  lah22:  "https://www.losandes.com.ar/politica/sigue-la-construccion-de-ciclovias-en-el-gran-mendoza-donde-estan-ubicados-los-nuevos-tramos",
  mza21:  "https://www.mendoza.gov.ar/prensa/unicipio-avanza-la-red-de-ciclovias-en-4-departamentos-en-simultaneo/",
  bici:   "https://bicitran.stmendoza.com",
  tarifa: "https://www.losandes.com.ar/sociedad/bicitran-2025-numeros-156000-usuarios-recorrieron-1400000-kilometros-y-quemaron-35000000-calorias-n5975447",
  corte18:"https://www.sitioandino.com.ar/servicios/transito-ciudad-mendoza-cortes-calles-y-desvios-este-18-junio-n5725002",
  corte24:"https://www.sitioandino.com.ar/servicios/transito-ciudad-mendoza-cortes-calles-y-desvios-este-24-junio-n5725343",
  pump:   "https://www.mendoza.gov.ar/prensa/suarez-inauguro-un-nuevo-espacio-para-el-deporte-en-la-ciudad-de-mendoza/"
};

["ciclovias","zonas_estacionamiento","estaciones_bicitran","tarifas","cortes_calle",
 "bicicleterias","pump_tracks"].forEach(c => db[c].drop());

// ---------- validadores ----------
db.createCollection("cortes_calle", { validator: { $and: [
  { $expr: { $gte: ["$fechaFin", "$fechaInicio"] } },
  { $jsonSchema: { bsonType: "object", required: ["calle","motivo","trazado","fechaInicio","fechaFin"],
    properties: {
      motivo: { bsonType: "string", minLength: 3 },
      tipo_restriccion: { enum: ["total","media_calzada","un_carril","sin_estacionamiento"] },
      trazado: { bsonType: "object", required: ["type","coordinates"],
                 properties: { type: { enum: ["LineString","Point"] } } },
      fechaInicio: { bsonType: "date" }, fechaFin: { bsonType: "date" }, expiraEn: { bsonType: "date" } } } } ],
  validationLevel: "strict", validationAction: "error" });
db.createCollection("bicicleterias", { validator: { $jsonSchema: { bsonType: "object",
  required: ["nombre","servicios","ubicacion"],
  properties: { servicios: { bsonType: "array", items: { enum:
    ["bicicleta","monopatin","scooter","patineta","skate","ebike","baterias","diagnostico_electrico","venta"] } },
    ubicacion: { bsonType: "object", required: ["type","coordinates"] } } } } });

// ---------- ciclovias (calles VERIFICADAS en prensa; km aproximado; trazado PLACEHOLDER) ----------
const cv = (nombre, mun, ini, fin, km, fuente, extra={}) => Object.assign({
  nombre, municipio: mun, inicio: { nombre: ini, punto: ph() }, fin: { nombre: fin, punto: ph() },
  trazado: linea(), longitud_km: km, tipo: "segregada_hormigon", tipo_calidad: "inferido (hormigonado y pintura segun nota)",
  estado: "existente_o_en_obra_segun_fuente", coordenadas: COORD,
  calidad_dato: "V_texto/P_coordenadas", fuente }, extra);
db.ciclovias.insertMany([
  cv("Av. General Paz","Las Heras","Independencia","Aristóbulo del Valle",4,F.lah22,{longitud_nota:">4 km"}),
  cv("Martínez de Rozas","Ciudad","Houssay","Newbery",null,F.lah22,{longitud_nota:">4 km combinado con Lencinas y Peltier-Morón"}),
  cv("Peltier-Morón","Ciudad",null,null,0.5,F.lah22),
  cv("Sarmiento","Godoy Cruz","Cervantes","Independencia",1,F.lah22),
  cv("Av. Cervantes","Godoy Cruz",null,null,1,F.lah22,{longitud_nota:">1 km; limites no informados"}),
  cv("Balcarce","Godoy Cruz","Erlich","Montecaseros",null,F.mza21,{longitud_nota:"2022: Balcarce y Mitre casi 1,5 km"}),
  cv("Minuzzi","Godoy Cruz","Los Álamos","lateral Costanera",null,F.mza21),
  cv("Av. Lencinas","Ciudad","Boulogne Sur Mer","rotonda UNCuyo",null,F.mza21,{longitud_nota:">1 km (2022)"}),
  cv("Av. San Martín (tramos)","Luján de Cuyo","Av. Juan José Paso","Roque Sáenz Peña",5,F.mza21,{longitud_nota:"casi 5 km combinados, 2 tramos"})
]);
// Gaps: Guaymallen (Panama, sin km), Maipu (6 de Septiembre ~550 m), Lavalle: sin limites verificados.

// ---------- tarifas (VERIFICADO; monto del boleto 2026 = probable 1.400, fuente con error tipografico) ----------
db.tarifas.insertMany([
  { sistema: "biciTRAN", vigencia_desde: ISODate("2026-01-01"), moneda: "ARS", calidad_dato: "V_con_reserva", fuente: F.tarifa,
    viaje_60min: 1400, viaje_calidad: "aproximado (fuente escribe $.1400)",
    planes: { cinco_viajes: 3920, semanal: 13720, mensual: 31920, anual: 299600 },
    recargo_tiempo_extra: null, multas: null, nota: "recargos y multas no encontrados" },
  { sistema: "biciTRAN", vigencia_desde: ISODate("2025-08-28"), moneda: "ARS", calidad_dato: "V",
    fuente: "https://www.sitioandino.com.ar/sociedad/bicitran-cumple-anos-el-servicio-transporte-es-utilizado-casi-144-mil-mendocinos-n5706823",
    viaje_60min: 1000, planes: { cinco_viajes: 2800, mensual: 28500, anual: 214000 } }
]);
const t26 = db.tarifas.findOne({ vigencia_desde: ISODate("2026-01-01") });

// ---------- estaciones biciTRAN: solo NOMBRES verificados; resto null o placeholder ----------
const nombres = ["Escuela Nacional","Municipalidad","Plaza del Soldado","Cortada Falucho","Teatro Municipal",
  "Plaza de las Banderas","Plaza Constituyentes","Plaza 25 de Mayo","Estación Mitre","Legislatura",
  "Hospital Cullen","Av. Freyre","Estación Belgrano"];
const masUsadas = ["Arístides","Parque San Vicente","Plaza Independencia","Parque Lineal"]; // 2023, depto sin verificar
db.estaciones_bicitran.insertMany(
  nombres.map(n => ({ nombre: n, departamento: "Ciudad (segun listado parcial, no verificado)",
    ubicacion: ph(), coordenadas: COORD, capacidad_spots: null, capacidad_nota: "10 spots visto en listado, sin confirmar",
    bicis_disponibles: null, activa: true, tarifa_id: t26._id,
    tarifa_resumen: { viaje_60min: 1400, vigencia: "2026-01" },
    calidad_dato: "V_nombre/P_coordenadas", fuente: F.bici }))
 .concat(masUsadas.map(n => ({ nombre: n, departamento: null, ubicacion: ph(), coordenadas: COORD,
    capacidad_spots: null, bicis_disponibles: null, activa: true, tarifa_id: t26._id,
    tarifa_resumen: { viaje_60min: 1400, vigencia: "2026-01" }, calidad_dato: "V_nombre/P_coordenadas",
    fuente: "https://www.mendoza.gov.ar/prensa/en-tres-semanas-bicitran-ya-registra-mas-de-6-000-viajes" })))
);

// ---------- zonas de estacionamiento ----------
db.zonas_estacionamiento.insertMany([
  { nombre: "Bicicletero Casa de Gobierno (Centro Cívico)", municipio: "Ciudad", vehiculos_permitidos: ["bicicleta"],
    capacidad: null, horario: "6:30-20:00", seguridad: "recinto cerrado con cámaras y personal", ubicacion: ph(),
    coordenadas: COORD, calidad_dato: "V_texto/P_coordenadas",
    fuente: "https://www.mendoza.gov.ar/prensa/la-casa-de-gobierno-cuenta-con-el-primer-bicicletero-publico-para-empleados-y-ciudadanos/" },
  { nombre: "Zona scooter (modelo regla Ciudad, Res. 715/2022)", municipio: "Ciudad", vehiculos_permitidos: ["scooter","monopatin"],
    capacidad: null, regla: "estaciones virtuales o fisicas; prohibido cerca de accesos de vehiculos, paradas, esquinas, sendas y ciclovias",
    ubicacion: ph(), coordenadas: COORD, calidad_dato: "A_ejemplo_de_regla (no es una zona real)",
    fuente: "https://economiasustentable.com/noticias/vuelve-el-alquiler-de-monopatines-electricos-en-la-ciudad-que-requisitos-habra-que-cumplir-para-ofrecer-el-servicio/amp/" }
]);

// ---------- cortes (parte 18/06/2026 y 24/06/2026; fechaFin = fin del dia: SUPUESTO, la fuente no da fin) ----------
const dia = (d, h="08:30") => ISODate(`2026-06-${d}T${h}:00-03:00`);
const fin = d => ISODate(`2026-06-${d}T23:59:59-03:00`);
const exp = d => ISODate(`2026-07-${d}T00:00:00-03:00`);
const corte = (calle, d, h, ddia, tipo, motivo, nota, fuente) => ({ calle, tramo_desde: d, tramo_hasta: h,
  tipo_restriccion: tipo, motivo, fechaInicio: dia(ddia), fechaFin: fin(ddia), expiraEn: exp(ddia),
  desvio: null, observacion: nota, trazado: linea(), coordenadas: COORD,
  calidad_dato: "V_texto/A_fechaFin/P_coordenadas", fuente });
db.cortes_calle.insertMany([
  corte("Arístides Villanueva","Huarpes","Boulogne Sur Mer","18","total","no_indicado","desvio por Arístides Villanueva y Paso de los Andes (segun parte)",F.corte18),
  corte("Boulogne Sur Mer","Sargento Cabral","Arístides","18","un_carril","reparacion_pavimento","un carril habilitado",F.corte18),
  corte("Salta","Alem","Garibaldi","18","un_carril","reparacion_pavimento","un carril habilitado",F.corte18),
  corte("San Lorenzo","Perú","Montevideo","18","total","repavimentacion","desde 8.30 h",F.corte18),
  corte("Fragata Moyano","9 de Julio","España","18","total","repavimentacion",null,F.corte18),
  corte("Lamadrid","Boulogne Sur Mer","Paso de los Andes","18","total","poda","cerrada por la manana",F.corte18),
  corte("Chile","Los Toneles","Pellegrini","18","sin_estacionamiento","otro","sin estacionamiento por la manana",F.corte18),
  corte("Lamadrid","Martínez de Rozas","Belgrano","24","media_calzada","poda","desde 8.30 h; la fuente se contradice entre resumen y cuerpo, verificar",F.corte24),
  corte("Luzuriaga","Boulogne Sur Mer","Paso de los Andes","24","media_calzada","poda","desde 8.30 h; idem contradiccion",F.corte24)
]);
// tipo_restriccion "total" en 18/06 para San Lorenzo, Fragata Moyano, Lamadrid y Arístides es INTERPRETACION:
// el parte decia "sin cortes totales"; revisar contra el texto original antes de la defensa.

// ---------- bicicleterias (3 candidatos; ninguno con direccion+servicio+coordenadas completas) ----------
db.bicicleterias.insertMany([
  { nombre: "E-Bikes Argentina", servicios: ["ebike","baterias","diagnostico_electrico"], direccion: null,
    horario: ["L-V 10:00-18:00","S 10:00-14:00"], telefono_whatsapp: "+54 9 261 2156111", departamento: "Mendoza (sin barrio)",
    ubicacion: ph(), coordenadas: COORD, calidad_dato: "V_parcial",
    fuente: "https://e-bikesargentina.com/sobre-nosotros-ebiks-argentina-mendoza/" },
  { nombre: "Feel Move", servicios: ["monopatin","scooter"], servicios_nota: "taller oficial segun Los Andes (19/01/2026)",
    direccion: null, departamento: "Godoy Cruz", ubicacion: ph(), coordenadas: COORD, calidad_dato: "V_parcial",
    fuente: "https://www.losandes.com.ar/economia/boom-monopatines-electricos-reemplazar-el-micro-cuanto-cuestan-y-donde-se-consiguen-n5977488" },
  { nombre: "Spartan Bike", servicios: ["venta"], servicios_nota: "reparacion NO confirmada; tel. con codigo de Cordoba",
    direccion: "Av. San Martín Sur 1010, Local 3", departamento: "Godoy Cruz", ubicacion: ph(), coordenadas: COORD,
    calidad_dato: "V_direccion", fuente: "https://spartanbike.com.ar/" }
]);

// ---------- pump tracks ----------
db.pump_tracks.insertOne({ nombre: "Pump track Parque Deportivo de Montaña (Cerro de la Gloria)", tipo: "pump_track",
  departamento: "Ciudad de Mendoza", superficie: "asfalto y cemento", longitud_m: 200, iluminacion: "LED",
  inauguracion: ISODate("2021-10-16"), acceso: "publico (segun nota)", costo: null,
  ubicacion: ph(), coordenadas: COORD, calidad_dato: "V_texto/P_coordenadas", fuente: F.pump });

// ---------- indices geoespaciales y de apoyo ----------
db.ciclovias.createIndex({ trazado: "2dsphere" });
db.zonas_estacionamiento.createIndex({ ubicacion: "2dsphere" });
db.estaciones_bicitran.createIndex({ ubicacion: "2dsphere" });
db.cortes_calle.createIndex({ trazado: "2dsphere" });
db.cortes_calle.createIndex({ fechaInicio: 1, fechaFin: 1 });
db.cortes_calle.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 });   // ver nota TTL
db.bicicleterias.createIndex({ ubicacion: "2dsphere" });
db.bicicleterias.createIndex({ servicios: 1 });
db.pump_tracks.createIndex({ ubicacion: "2dsphere" });
["ciclovias","estaciones_bicitran","cortes_calle","bicicleterias","pump_tracks","zonas_estacionamiento","tarifas"]
  .forEach(c => print(c, db[c].countDocuments()));
