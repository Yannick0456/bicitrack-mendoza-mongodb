// En mongosh: comparar conteos e indices y re-ejecutar una consulta clave
["ciclovias","estaciones_bicitran","cortes_calle","bicicleterias","pump_tracks","tarifas"].forEach(c =>
  print(c, db.getSiblingDB("bicitrack")[c].countDocuments(), db.getSiblingDB("bicitrack_verif")[c].countDocuments()));
printjson(db.getSiblingDB("bicitrack_verif").estaciones_bicitran.getIndexes());   // debe incluir 2dsphere
