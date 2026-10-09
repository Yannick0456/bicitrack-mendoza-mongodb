# bicitrack-mendoza-mongodb

Proyecto académico de **Bases de Datos** (Ingeniería Informática, Universidad de Mendoza): diseño de una base de datos **MongoDB** geoespacial para una aplicación de movilidad en bicicleta en Mendoza (ciclovías, bicis públicas biciTRAN, estacionamientos, cortes de calle, bicicleterías y pump tracks).

> **Importante:** los datos de texto (calles, tarifas, nombres de estaciones) provienen de fuentes públicas citadas en el informe. **Las coordenadas son placeholders**, no están verificadas, y los resultados de distancia/cercanía no tienen significado real hasta geocodificarlas. Cada documento lleva `calidad_dato` y `coordenadas.estado` para dejarlo explícito.

## Qué incluye

| Archivo | Contenido |
|---|---|
| `scripts/01_carga.js` | Crea 7 colecciones con validadores `$jsonSchema`, carga datos etiquetados y crea índices (2dsphere, TTL, multikey) |
| `scripts/02_consultas.js` | 10 consultas: `$geoNear`, `$near`, `$geoWithin`, `$geoIntersects`, `$group`, `$facet` |
| `scripts/03_medir_rendimiento.js` | Dataset sintético de 500.000 viajes y medición con `explain("executionStats")` antes y después de indexar |
| `scripts/04_backup.sh` | Backup con `mongodump --gzip --archive`, rotación de 7 días |
| `scripts/05_restore_verificacion.sh` | Restauración en una base aparte para verificar el backup |
| `scripts/06_verificar_restauracion.js` | Comparación de conteos e índices |
| `docs/informe_diseno.md` | Informe completo: modelado, fuentes, decisiones y política de backup (RPO/RTO) |
| `docs/ejemplos_documentos.js` | Documentos de ejemplo |

## Cómo correrlo

Requiere MongoDB local o Docker (Atlas M0 no sirve para medir rendimiento ni para backups).

```bash
docker compose up -d
mongosh "mongodb://localhost:27017/bicitrack" scripts/01_carga.js
mongosh "mongodb://localhost:27017/bicitrack" scripts/02_consultas.js
mongosh "mongodb://localhost:27017/bicitrack" scripts/03_medir_rendimiento.js
```

## Resultados de rendimiento

Medición con `explain("executionStats")` sobre **500.000 viajes sintéticos** (no son datos reales de Mendoza), MongoDB 7 en Docker, mediana de 7 corridas por consulta. Script: `scripts/03_medir_rendimiento.js`.

| Consulta | Índice creado | Etapa antes → después | Docs examinados | Mediana (ms) | Ratio docs/devueltos |
|---|---|---|---|---|---|
| Q1: viajes de un usuario por estado, ordenados por fecha | `{usuario_id, estado, inicio}` | COLLSCAN → IXSCAN + FETCH | 500.000 → 26 | 128 → 0 | 19.230,8 → 1 |
| Q2: viajes en un radio de 500 m (`$centerSphere`) | `2dsphere` | COLLSCAN → IXSCAN + FETCH | 500.000 → 351 | 335 → 1 | 1.879,7 → 1,3 |
| Q3: viajes dentro de un polígono (`$geoWithin`) | `2dsphere` | COLLSCAN → IXSCAN + FETCH | 500.000 → 1.336 | 354 → 4 | 517,1 → 1,4 |

**Cómo leerlo:** el indicador más confiable es la cantidad de documentos examinados, porque los milisegundos varían entre corridas y con valores tan bajos (0 a 4 ms) tienen poca resolución. Todas las mediciones se hicieron en una sola máquina y con datos sintéticos, así que sirven para comparar antes y después, no como benchmark absoluto.

## Estado

- [x] `01_carga.js` ejecutado (carga de las 7 colecciones con validadores e índices)
- [x] `03_medir_rendimiento.js` ejecutado, resultados arriba
- [ ] `02_consultas.js` ejecutado, pero sin salida impresa todavía: falta mostrar los resultados de cada consulta
- [ ] Backup y restauración probados
- [ ] Coordenadas reales (OpenStreetMap `highway=cycleway`, GBFS de biciTRAN)

## Autor

Yannick Franco Baroné — [GitHub](https://github.com/Yannick0456)
