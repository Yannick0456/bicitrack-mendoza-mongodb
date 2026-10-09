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
