import "node_modules/@adamhl8/configs/dist/configs/justfile.base.just"

generate-schemas:
    ./generate-schemas.sh

build: generate-schemas _build
