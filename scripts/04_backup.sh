#!/usr/bin/env bash
# /opt/backup/mongo_backup.sh  -- replica set: usar --oplog (dump completo, sin --db). Standalone: quitar --oplog y agregar --db=bicitrack
set -euo pipefail
DEST=/var/backups/mongo; STAMP=$(date +%Y%m%d_%H%M%S); mkdir -p "$DEST"
mongodump --uri="mongodb://localhost:27017" --oplog --gzip --archive="$DEST/full_$STAMP.archive.gz"
find "$DEST" -name 'full_*.archive.gz' -mtime +7 -delete        # retencion diaria 7 dias (semanales/mensuales: copiar aparte)
echo "$(date -Is) OK full_$STAMP" >> "$DEST/backup.log"
# crontab -e :   0 2 * * *  /opt/backup/mongo_backup.sh >> /var/log/mongo_backup.err 2>&1
# En Windows: Programador de tareas con un .bat/PowerShell que ejecute el mismo mongodump.
