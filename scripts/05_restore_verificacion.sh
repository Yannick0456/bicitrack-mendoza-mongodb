# Verificacion: restaurar a otra base sin pisar la original (sin --oplog en el dump para poder usar --nsFrom/--nsTo)
mongorestore --gzip --archive=/var/backups/mongo/full_XXXX.archive.gz --nsFrom='bicitrack.*' --nsTo='bicitrack_verif.*'
# Si el dump uso --oplog, restaurar en una instancia aparte con --oplogReplay (no se combina con --nsFrom/--nsTo)
