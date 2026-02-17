#!/usr/bin/env bash
# Crea un ZIP del proyecto excluyendo node_modules, .git y .env
# Uso: ./create_and_zip.sh jeferson-money-earns
set -e
PROJECT_DIR=${1:-jeferson-money-earns}
ZIP_NAME="${PROJECT_DIR}.zip"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: directorio $PROJECT_DIR no existe."
  exit 1
fi
echo "Creando ZIP $ZIP_NAME ..."
zip -r "$ZIP_NAME" "$PROJECT_DIR" -x "*/node_modules/*" -x "*/.git/*" -x "*/.env" -x "*/.env.local"
echo "ZIP creado: $ZIP_NAME"