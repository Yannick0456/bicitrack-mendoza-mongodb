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

## Estado

- [ ] Scripts ejecutados y verificados en una instancia real
- [ ] Resultados de `explain()` agregados (tabla antes/después)
- [ ] Coordenadas reales (OpenStreetMap `highway=cycleway`, GBFS de biciTRAN)

## Autor

Yannick Franco Baroné — [GitHub](https://github.com/Yannick0456)
