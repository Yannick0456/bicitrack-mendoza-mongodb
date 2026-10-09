# Diseñar el bici-track de Mendoza en MongoDB

La mejor forma de resolver el proyecto es una base `bicitrack` con **siete colecciones geoespaciales de dominio** (`ciclovias`, `zonas_estacionamiento`, `estaciones_bicitran`, `tarifas`, `cortes_calle`, `bicicleterias`, `pump_tracks`) más una colección sintética (`viajes`) para medir rendimiento. Todas las geometrías van en GeoJSON con índice `2dsphere`. El rendimiento se demuestra con `explain("executionStats")` antes y después de crear índices, y el resguardo con `mongodump --gzip --archive` programado, rotación y restauración verificada en una base aparte. Los datos reales de Mendoza que la investigación pudo verificar son pocos. Hay tramos de ciclovías con calle de inicio y fin, 13 nombres de estaciones de biciTRAN, sus tarifas a enero de 2026, un único pump track (Cerro de la Gloria), tres comercios candidatos a bicicletería y dos partes de cortes de calle de junio de 2026. **No hay coordenadas verificadas de nada**, no se halló API abierta ni feed GBFS de biciTRAN, y solo hay un pump track y pocas bicicleterías confirmadas. Por eso el script de carga de este informe etiqueta cada dato como verificado, aproximado o placeholder, y usa coordenadas placeholder que hay que reemplazar por geocodificación. La rúbrica real de los profesores Zapata y Cozzolino no es pública: la estructura propuesta sigue lo que declaraste (requisitos, modelado, carga, consultas, índices, resguardo) y conviene contrastarla con la consigna escrita.

## Qué datos reales existen y cuáles faltan

El sistema público vigente es **biciTRAN**, de la Provincia, operado por la Sociedad de Transporte de Mendoza (STM). Reporta 90 estaciones en 5 departamentos: Ciudad 37, Godoy Cruz 22, Guaymallén 17, Luján de Cuyo 10 y Las Heras 4 ([STM, Estadísticas 2025](https://stmendoza.com/wp-content/uploads/2026/04/Estadisticas-de-Operaciones-2025-Sociedad-de-Transporte-de-Mendoza.pdf)). El balance del 1/1/2026 habla de 88 estaciones, más de 550 bicis activas y 14 tótems de reparación ([Los Andes](https://www.losandes.com.ar/sociedad/bicitran-2025-numeros-156000-usuarios-recorrieron-1400000-kilometros-y-quemaron-35000000-calorias-n5975447)). La diferencia 88 vs 90 corresponde probablemente a dos cortes de fecha distintos. El antecesor municipal "En la Bici" (Ciudad y Godoy Cruz) es histórico y sirve como dato de contexto ([Sitio Andino](https://www.sitioandino.com.ar/sociedad/llego-bicitran-mendoza-cuanto-sale-y-como-funciona-n5660445)).

**Costo.** La tarifa se indexa al boleto de colectivo. En enero de 2026 el viaje de 60 minutos equivale al boleto (la fuente escribe "$.1400"; es probablemente $1.400, tratado aquí como aproximado), el pase de 5 viajes cuesta $3.920, el semanal $13.720, el mensual $31.920 y el anual $299.600 ([Los Andes, 1/1/2026](https://www.losandes.com.ar/sociedad/bicitran-2025-numeros-156000-usuarios-recorrieron-1400000-kilometros-y-quemaron-35000000-calorias-n5975447)). En agosto de 2025 eran $1.000, $2.800, $28.500 y $214.000 ([Sitio Andino](https://www.sitioandino.com.ar/sociedad/bicitran-cumple-anos-el-servicio-transporte-es-utilizado-casi-144-mil-mendocinos-n5706823)). Ese historial justifica una colección `tarifas` con vigencia. No se encontraron el recargo por tiempo extra, las multas ni tarifas posteriores a enero de 2026, así que esos campos quedan nulos.

**Ciclovías.** No existe listado oficial completo ni geometría descargable. Hay tramos sueltos con calle de inicio y fin en notas de prensa. La nota de Los Andes del 17/6/2022 da, por ejemplo, Av. General Paz de Independencia a Aristóbulo del Valle (Las Heras, más de 4 km), Martínez de Rozas de Houssay a Newbery (Ciudad) y Sarmiento de Cervantes a Independencia (Godoy Cruz, 1 km) ([Los Andes](https://www.losandes.com.ar/politica/sigue-la-construccion-de-ciclovias-en-el-gran-mendoza-donde-estan-ubicados-los-nuevos-tramos)). La nota de diciembre de 2021 agrega Av. Lencinas (Boulogne Sur Mer a rotonda UNCuyo), Balcarce (Erlich a Montecaseros) y Minuzzi (Los Álamos a lateral Costanera) ([mendoza.gov.ar](https://www.mendoza.gov.ar/prensa/unicipio-avanza-la-red-de-ciclovias-en-4-departamentos-en-simultaneo/)). Las cifras agregadas son de fechas y definiciones distintas (red existente de unos 170 km en 2020, según [mendoza.gov.ar](https://www.mendoza.gov.ar/prensa/mendoza-tendra-la-red-de-ciclovias-metropolitana-mas-grande-del-pais/)) y no deben sumarse como estado 2026. Guaymallén y Maipú casi no tienen datos, y no hay fuente para ciclovías recreativas.

**Estacionamiento.** El único bicicletero concreto verificado es el de Casa de Gobierno, un recinto cerrado con cámaras y personal de 6:30 a 20:00, inaugurado en 2019 ([mendoza.gov.ar](https://www.mendoza.gov.ar/prensa/la-casa-de-gobierno-cuenta-con-el-primer-bicicletero-publico-para-empleados-y-ciudadanos/)). Existe además un plan de 1.000 bicicleteros en edificios públicos (unos 5.000 lugares). Para scooters rige en la Ciudad el marco de la Resolución 715 (2022). Exige geocercas, estacionamiento en estaciones virtuales o físicas y prohíbe estacionar cerca de accesos de vehículos, paradas, esquinas, sendas peatonales y ciclovías ([Economía Sustentable](https://economiasustentable.com/noticias/vuelve-el-alquiler-de-monopatines-electricos-en-la-ciudad-que-requisitos-habra-que-cumplir-para-ofrecer-el-servicio/amp/)). No se confirmaron operadores ni zonas vigentes en 2026.

**Cortes.** Los publica la Municipalidad y los replica Sitio Andino en un parte diario. El del 18/6/2026 lista, entre otros, Boulogne Sur Mer (Sargento Cabral a Arístides) por reparación de pavimento con un carril habilitado, San Lorenzo (Perú a Montevideo) por repavimentación y Lamadrid (Boulogne Sur Mer a Paso de los Andes) por poda ([Sitio Andino 18/6/2026](https://www.sitioandino.com.ar/servicios/transito-ciudad-mendoza-cortes-calles-y-desvios-este-18-junio-n5725002)). El del 24/6/2026 trae dos cortes parciales por poda (Lamadrid y Luzuriaga), con una contradicción interna entre resumen y cuerpo que hay que verificar ([Sitio Andino 24/6/2026](https://www.sitioandino.com.ar/servicios/transito-ciudad-mendoza-cortes-calles-y-desvios-este-24-junio-n5725343)). No hay dataset ni API oficial, ni cortes de otros departamentos, ni ejemplos de maratones, accidentes o arreglos de red.

**Bicicleterías y pump tracks.** Los tres comercios candidatos no completan una colección. Spartan Bike tiene sucursal en Av. San Martín Sur 1010, Local 3, Godoy Cruz, pero su sitio no menciona reparación y los teléfonos tienen código de Córdoba ([Spartan Bike](https://spartanbike.com.ar/)). Feel Move (Godoy Cruz) tiene "taller oficial" según Los Andes, sin dirección ([Los Andes, 19/1/2026](https://www.losandes.com.ar/economia/boom-monopatines-electricos-reemplazar-el-micro-cuanto-cuestan-y-donde-se-consiguen-n5977488)). E-Bikes Argentina atiende de lunes a viernes de 10 a 18 y sábados de 10 a 14, con reparación de baterías y diagnóstico eléctrico, pero sin dirección ([E-Bikes Argentina](https://e-bikesargentina.com/sobre-nosotros-ebiks-argentina-mendoza/)). No hay ningún servicio de skates confirmado. El único pump track confirmado es el del Parque Deportivo de Montaña (Cerro de la Gloria, Ciudad): circuito de asfalto de 200 m, inaugurado el 16/10/2021 ([Gobierno de Mendoza](https://www.mendoza.gov.ar/prensa/suarez-inauguro-un-nuevo-espacio-para-el-deporte-en-la-ciudad-de-mendoza/)).

| Dato pedido | Estado | Qué hacer |
|---|---|---|
| Coordenadas de cualquier entidad | **Ninguna verificada** | Geocodificar a mano (OSM/Google Maps) y cambiar `coordenadas.estado` a `verificada` |
| API/GBFS de biciTRAN | Sin evidencia; el acceso a `stmendoza.com` falló por bloqueo del proxy | Probar `https://bicitran.stmendoza.com/gbfs.json` y el portal de datos abiertos provincial desde tu red |
| Direcciones y capacidad por estación | Solo 13 nombres; "10 spots" visto en 18 entradas, no confirmado | Completar desde la app biciTRAN |
| Geometría de ciclovías | Solo calles de inicio y fin | Extraer `highway=cycleway` de OSM o consultar IDE Mendoza |
| Bicicleterías y pump tracks | 3 comercios parciales, 1 pump track | Relevamiento manual en Maps; declarar la muestra como acotada |
| Tarifas posteriores a enero de 2026, multas, recargos | No encontrados | Dejar `null` y documentar |

## Modelo de datos: siete colecciones y un esquema justificado

El manual de MongoDB recomienda embeber las relaciones "contiene" y las 1-N donde los hijos se leen en contexto del padre, con documentos menores a 16 MiB ([Embedding](https://www.mongodb.com/docs/manual/data-modeling/embedding/)). El patrón Extended Reference copia solo campos estables del documento referenciado y evita `$lookup`, a costa de duplicación ([Blog](https://www.mongodb.com/blog/post/building-with-patterns-the-extended-reference-pattern)). Aplicado al dominio: `inicio` y `fin` de cada ciclovía van embebidos, porque el pedido es "dónde empiezan y terminan". Los servicios de una bicicletería van como array. Las tarifas son un catálogo que cambia (subió cerca de 40% entre agosto de 2025 y enero de 2026), así que viven en su colección y las estaciones guardan `tarifa_id` más un `tarifa_resumen` copiado. Los cortes referencian la ciclovía afectada con `ciclovia_id` y `ciclovia_nombre`. Los cortes vencidos pueden pasar a `cortes_historico` (patrón Archive) en lugar de borrarse. `zonas_estacionamiento` es polimórfica: guarda `ubicacion` (Point) y opcionalmente `area` (Polygon), y un único `2dsphere` sirve a ambos.

| Colección | Geometría | Embebido | Referencia |
|---|---|---|---|
| `ciclovias` | `trazado` LineString/MultiLineString | `inicio`, `fin`, `tipo`, `longitud_m`, `estado` | municipio (texto) |
| `zonas_estacionamiento` | `ubicacion` Point (y `area` Polygon opcional) | `vehiculos_permitidos`, `capacidad`, `horario`, `regla` | - |
| `estaciones_bicitran` | `ubicacion` Point | `capacidad_spots`, `bicis_disponibles`, `departamento` | `tarifa_id` + `tarifa_resumen` |
| `tarifas` | - | planes (viaje, 5 viajes, semanal, mensual, anual) y vigencia | - |
| `cortes_calle` | `trazado` LineString | `motivo`, `tipo_restriccion`, fechas, `desvio`, `expiraEn` | `ciclovia_id`, `ciclovia_nombre` |
| `bicicleterias` | `ubicacion` Point | `servicios[]`, `horario[]`, contacto | - |
| `pump_tracks` | `ubicacion` Point | superficie, longitud, acceso, costo | - |
| `viajes` (sintética) | `ubicacion` Point | usuario, estado, distancia | - |

Todos los documentos llevan tres campos de calidad de dato, que son la forma honesta de convivir con los vacíos: `calidad_dato` (`verificado`, `aproximado`, `placeholder`), `fuente` (URL) y `coordenadas.estado` (`placeholder_no_verificado` o `verificada`). Ejemplos (formato mongosh):

```js
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
```

La validación se hace con `$jsonSchema` en `createCollection`. El validador exige campos y tipos, y se puede combinar con `$expr` dentro de `$and` para forzar `fechaFin >= fechaInicio` ([Schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/)). El script de carga lo incluye para `cortes_calle` y `bicicleterias`. Las coordenadas siempre van como `[longitud, latitud]` ([GeoJSON](https://www.mongodb.com/docs/manual/reference/geojson/)).

## Script de carga con datos etiquetados

El siguiente script `mongosh` (`mongosh bicitrack carga.js`) está **escrito pero no ejecutado** en una instancia real. Todos los textos (calles, nombres, fechas, tarifas) provienen de las fuentes citadas arriba. Las coordenadas **no** provienen de ninguna fuente: la función `ph()` genera puntos placeholder deterministas alrededor del centro aproximado de Mendoza (lng -68.84, lat -32.89), solo para que las consultas geoespaciales corran. Los resultados de distancia, cercanía e intersección **carecen de significado real** hasta reemplazar esas coordenadas. Si con `ph()` cada ciclovía tiene un trazado de dos puntos al azar, no esperes que `$geoIntersects` con cortes dé cruces con sentido.

```js
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
```

Una advertencia sobre el TTL en este script: los cortes de junio de 2026 tienen `expiraEn` en julio de 2026, que ya pasó, así que **MongoDB los borrará en el siguiente ciclo del hilo TTL (cada ~60 s)** ([TTL](https://www.mongodb.com/docs/manual/core/index-ttl/)). Para la defensa, comentá la línea del TTL (o poné `expiraEn` a una fecha futura) y demostrá el TTL con un documento nuevo aparte. Si querés historial, la alternativa es archivar a `cortes_historico`.

## Consultas avanzadas y requisitos que cubren

Las consultas responden una a una las preguntas del enunciado. `$near` ordena por distancia y acepta `$maxDistance` en metros para GeoJSON, pero no se usa en pipelines de aggregation (para eso existe `$geoNear`, que debe ser la primera etapa y requiere índice geoespacial) ([$near](https://www.mongodb.com/docs/manual/reference/operator/query/near/), [$geoNear](https://www.mongodb.com/docs/manual/reference/operator/aggregation/geoNear/)). `$geoWithin` no exige índice (mejora con él) y devuelve sin orden ([$geoWithin](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/)). `$geoIntersects` solo se acelera con 2dsphere ([$geoIntersects](https://www.mongodb.com/docs/manual/reference/operator/query/geoIntersects/)).

```js
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
```

Dos reservas técnicas, sin verificar contra documentación: R7 depende de que las polilíneas realmente se crucen. En datos reales, dos tramos casi superpuestos pueden no intersectar por diferencias de digitalización. Una alternativa robusta es `$geoNear` desde los vértices del corte con `maxDistance` de unos 15 m. Además, la documentación de `$geoIntersects` ilustra Polygon y MultiPolygon, así que probá LineString como `$geometry` en tu instalación. El `$centerSphere` (radio en radianes = metros / 6378100) tampoco quedó verificado en la página leída. Desde MongoDB 8.0, `$near`, `$nearSphere` y `$geoNear` exigen que el punto de referencia sea un `Point` (la versión instalada determina qué notas de 8.1, 8.2 y 8.3 aplican).

## Medición de rendimiento: metodología antes y después con explain()

`explain("executionStats")` informa `nReturned`, `totalKeysExamined`, `totalDocsExamined` y `executionTimeMillis`. Este último incluye la selección de plan y excluye la transferencia de red ([Explain results](https://www.mongodb.com/docs/manual/reference/explain-results/)). El stage ganador distingue `COLLSCAN` (recorre toda la colección) de `IXSCAN` seguido de `FETCH`. La relación `totalDocsExamined / nReturned` es la métrica más estable, porque el tiempo varía entre corridas. Para índices compuestos se aplica la regla ESR: igualdad, luego orden, luego rango ([ESR](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)). Con 100.000 documentos pequeños las diferencias de tiempo serán de milisegundos, así que conviene subir a 500.000 o más si no se nota. Usá MongoDB local o Docker: Atlas M0 limita a 0,5 GB y a 100 operaciones por segundo, lo que distorsiona los tiempos de cargas repetidas, y no ofrece Performance Advisor ([límites M0](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)).

El procedimiento tiene siete pasos. Primero, cargar el dataset sintético (la colección `viajes` y `puntos_demo` son sintéticas y no representan Mendoza real; declaralo en el informe). Segundo, correr cada consulta sin índice (solo `_id`) y guardar el `explain`. Tercero, repetir 5 a 10 veces y tomar la mediana, porque la primera corrida incluye selección de plan y caché fría. Cuarto, crear el índice. Quinto, repetir las mediciones. Sexto, armar la tabla comparativa con stage, `keysExamined`, `docsExamined`, `nReturned`, ms y ratio. Séptimo, opcionalmente usar `hint({$natural:1})` para forzar un COLLSCAN sin borrar el índice, y `$indexStats` para detectar índices sin uso (`accesses.ops: 0`).

```js
// medir.js -- dataset sintetico (NO es data real de Mendoza)
const N = 500000, lote = [];
let s = 42; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;  // PRNG con semilla
db.viajes.drop(); db.puntos_demo.drop();
const estados = ["activo","finalizado","cancelado"];
for (let i = 0; i < N; i++) {
  lote.push({ usuario_id: Math.floor(rnd()*5000), estacion_origen: "E" + Math.floor(rnd()*90),
    estado: estados[Math.floor(rnd()*3)], distancia_km: +(rnd()*30).toFixed(2),
    inicio: new Date(Date.now() - rnd()*365*864e5),
    ubicacion: { type:"Point", coordinates:[ -68.84 + (rnd()-0.5)*0.4, -32.89 + (rnd()-0.5)*0.4 ] } });
  if (lote.length === 10000) { db.viajes.insertMany(lote); lote.length = 0; }
}
function medir(nombre, fn, veces = 7) {
  fn();                                                    // calentar
  const ms = []; let e;
  for (let i = 0; i < veces; i++) { e = fn().explain("executionStats"); ms.push(e.executionStats.executionTimeMillis); }
  ms.sort((a,b)=>a-b);
  const es = e.executionStats;
  const etapa = JSON.stringify(e.queryPlanner.winningPlan).match(/"stage":"(COLLSCAN|IXSCAN|GEO_NEAR_2DSPHERE|FETCH)"/g);
  printjson({ consulta: nombre, etapas: etapa, mediana_ms: ms[Math.floor(veces/2)], keys: es.totalKeysExamined,
              docs: es.totalDocsExamined, devueltos: es.nReturned,
              ratio: +(es.totalDocsExamined / Math.max(es.nReturned,1)).toFixed(1) });
}
const q1 = () => db.viajes.find({ usuario_id: 123, estado: "finalizado" }).sort({ inicio: -1 });
const centro = [-68.84, -32.89];
const q2 = () => db.viajes.find({ ubicacion: { $geoWithin: { $centerSphere: [ centro, 500/6378100 ] } } });
const q3 = () => db.viajes.find({ ubicacion: { $geoWithin: { $geometry: { type:"Polygon", coordinates:[[
  [-68.85,-32.895],[-68.83,-32.895],[-68.83,-32.880],[-68.85,-32.880],[-68.85,-32.895]]] } } } });

print("== ANTES (sin indices) ==");  medir("Q1 usuario+estado+sort", q1);  medir("Q2 radio 500 m", q2);  medir("Q3 poligono", q3);
db.viajes.createIndex({ usuario_id: 1, estado: 1, inicio: -1 });   // ESR: igualdad, igualdad, orden
db.viajes.createIndex({ ubicacion: "2dsphere" });
print("== DESPUES ==");  medir("Q1 usuario+estado+sort", q1);  medir("Q2 radio 500 m", q2);  medir("Q3 poligono", q3);
db.viajes.aggregate([{ $indexStats: {} }]);
```

Los resultados esperados (a confirmar al correrlo, no medidos aquí): Q1 pasa de `COLLSCAN` con un ordenamiento en memoria a `IXSCAN` + `FETCH` sin etapa de sort, y `docsExamined` baja de cerca de N a cerca de `nReturned`. Q2 y Q3 pasan de `COLLSCAN` a un plan con `IXSCAN` sobre el índice 2dsphere. El índice 2dsphere es siempre sparse y no indexa documentos sin el campo ([2dsphere](https://www.mongodb.com/docs/manual/core/indexes/index-types/geospatial/2dsphere/)). `$near` sin índice geoespacial falla, de modo que el contraste "antes" con `$near` no es posible y por eso se usa `$geoWithin`. Para completar el catálogo de índices, mostrá uno de cada tipo sobre las colecciones de dominio: `multikey` en `servicios`, `text` en nombres con un solo índice text por colección ([Text](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/)), `partial` con `partialFilterExpression` (la consulta debe incluir el filtro para usarlo, [Partial](https://www.mongodb.com/docs/manual/core/index-partial/)) y `unique`. Tené presente que un índice TTL no puede ser compuesto y que el borrado no es inmediato ([TTL](https://www.mongodb.com/docs/manual/core/index-ttl/)).

## Política de resguardo: mongodump diario, rotación y restauración probada

`mongodump` y `mongorestore` están pensados para despliegues pequeños, que es el caso, pero tienen RPO y RTO altos, no hacen incrementales ni point-in-time recovery, y no garantizan consistencia sin `fsync` o `--oplog`. Los snapshots de filesystem dan un punto exacto pero con impacto de escritura, y el PITR continuo requiere Cloud Manager u Ops Manager ([Backup methods](https://www.mongodb.com/docs/manual/core/backups/)). `--oplog` da un dump consistente en un punto en el tiempo, pero solo funciona contra miembros de un replica set y no se combina con `--db` ([mongodump](https://www.mongodb.com/docs/database-tools/mongodump/)). Atlas M0 no tiene backups ni admite `--oplog` ([límites M0](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)). Por eso conviene correr MongoDB local o en Docker como replica set de un nodo si querés usar `--oplog`.

La política propuesta (diseño propio, valores a justificar en el informe) tiene cinco elementos. El alcance es la base `bicitrack` completa; los índices viajan en la metadata del dump y `mongorestore` los reconstruye por defecto ([mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/)). El **RPO es de 24 horas** (dump diario a las 02:00) y el **RTO objetivo es menor a 30 minutos**, un valor razonable para un dataset chico. La retención es de 7 diarios, 4 semanales y 3 mensuales, siguiendo la regla 3-2-1 (tres copias, dos medios, una externa). El usuario de backup usa un rol dedicado (`backup`/`restore`, roles built-in no verificados aquí) y el directorio de respaldos tiene permisos restringidos. Y se hace una restauración de verificación semanal a una base distinta, registrando el tiempo como RTO observado.

```bash
#!/usr/bin/env bash
# /opt/backup/mongo_backup.sh  -- replica set: usar --oplog (dump completo, sin --db). Standalone: quitar --oplog y agregar --db=bicitrack
set -euo pipefail
DEST=/var/backups/mongo; STAMP=$(date +%Y%m%d_%H%M%S); mkdir -p "$DEST"
mongodump --uri="mongodb://localhost:27017" --oplog --gzip --archive="$DEST/full_$STAMP.archive.gz"
find "$DEST" -name 'full_*.archive.gz' -mtime +7 -delete        # retencion diaria 7 dias (semanales/mensuales: copiar aparte)
echo "$(date -Is) OK full_$STAMP" >> "$DEST/backup.log"
# crontab -e :   0 2 * * *  /opt/backup/mongo_backup.sh >> /var/log/mongo_backup.err 2>&1
# En Windows: Programador de tareas con un .bat/PowerShell que ejecute el mismo mongodump.
```

```bash
# Verificacion: restaurar a otra base sin pisar la original (sin --oplog en el dump para poder usar --nsFrom/--nsTo)
mongorestore --gzip --archive=/var/backups/mongo/full_XXXX.archive.gz --nsFrom='bicitrack.*' --nsTo='bicitrack_verif.*'
# Si el dump uso --oplog, restaurar en una instancia aparte con --oplogReplay (no se combina con --nsFrom/--nsTo)
```

```js
// En mongosh: comparar conteos e indices y re-ejecutar una consulta clave
["ciclovias","estaciones_bicitran","cortes_calle","bicicleterias","pump_tracks","tarifas"].forEach(c =>
  print(c, db.getSiblingDB("bicitrack")[c].countDocuments(), db.getSiblingDB("bicitrack_verif")[c].countDocuments()));
printjson(db.getSiblingDB("bicitrack_verif").estaciones_bicitran.getIndexes());   // debe incluir 2dsphere
```

La demostración oral recomendada es: hacer un dump, simular el desastre con `db.dropDatabase()` sobre una copia, restaurar, comparar conteos e índices y mostrar el tiempo medido. Para ilustrar recuperación a un instante, `--oplogReplay --oplogLimit` existe, pero la documentación advierte riesgo de corrupción si se especifican entradas manualmente, así que mencionalo como concepto, no como práctica. Aviso de seguridad: pasar la contraseña por `--uri` puede quedar visible en `ps`; usá el prompt o un archivo de configuración. El script de backup no fue probado en una instancia real.

## Plan de entrega y defensa oral

El orden de trabajo sugerido sigue las dependencias: el modelo condiciona la carga, y la carga es prerrequisito de consultas y mediciones. Antes de nada, conseguí la consigna escrita de Zapata y Cozzolino y verificá el formato de entrega, porque la rúbrica no es pública. La lista de verificación:

| Etapa | Entregable | Control |
|---|---|---|
| 1. Requisitos | Lista de preguntas de negocio (R1 a R10) y alcance: "la app no se desarrolla" | Cada requisito del enunciado tiene una consulta asociada |
| 2. Modelado | Diagrama de colecciones, tabla embed vs referencia, patrones (Extended Reference, Archive, Polymorphic, Computed), validadores | Justificar cada decisión con un criterio |
| 3. Datos | `carga.js` ejecutado, conteos por colección, tabla de calidad de dato | **Geocodificar al menos las entidades usadas en la demo** y cambiar `coordenadas.estado` |
| 4. Consultas | R1 a R10 corridas con salida capturada | Probar R7 (LineString) y confirmar sintaxis de `$centerSphere` |
| 5. Rendimiento | Tabla antes/después con mediana de 7 corridas, stage, ratio | Mismo hardware y dataset en ambas fases |
| 6. Resguardo | Política escrita, script, cron o tarea programada, restauración verificada | Capturar tiempo de RTO observado |
| 7. Defensa | Demo de 10 minutos y preguntas | Ver abajo |

Para la defensa, preparate para cinco preguntas probables. Por qué embeber `inicio` y `fin` pero referenciar tarifas: porque se leen siempre con la ciclovía, mientras que las tarifas cambian y las comparten muchas estaciones. Por qué `$geoNear` y no `$near` en un pipeline: porque `$near` no se usa en aggregation. Qué pasa con el TTL (borra definitivamente, con latencia de hasta 60 s) frente a archivar. Qué diferencia hay entre RPO y RTO y cuál es la de tu política. Y por qué los datos tienen etiquetas de calidad: porque no hay datos abiertos ni coordenadas verificadas, y es mejor declararlo que simular precisión. Una última precaución de honestidad: mencioná la muestra de datos reales como acotada (13 estaciones sobre unas 90, 9 tramos de ciclovía, 1 pump track, 3 comercios) y que el proyecto no pretende ser un censo.

## Conclusión

El hallazgo más útil para la entrega es que el valor del proyecto está en el diseño y en la medición, no en el volumen de datos reales: Mendoza no publica geometría, estado en tiempo real ni listados completos, y la investigación no encontró ninguna fuente abierta para ninguno de los seis dominios pedidos. Convertir esa carencia en un campo `calidad_dato` y un `coordenadas.estado` hace que el modelo sea defendible y a la vez listo para recibir datos reales cuando se geocodifiquen. Las dos acciones que más mejoran el proyecto con poco esfuerzo son probar manualmente `gbfs.json` de biciTRAN y descargar `highway=cycleway` de OpenStreetMap para el Gran Mendoza, porque reemplazarían de golpe las geometrías placeholder.

Queda pendiente verificar en una instancia real todo lo que este informe dejó marcado como no ejecutado: el script de carga, la sintaxis de `$centerSphere`, `$geoIntersects` con LineString y los resultados de `explain`. También quedan sin confirmar la vigencia en octubre de 2026 de las tarifas, de biciTRAN y del piloto de monopatines, y la rúbrica de la cátedra.
