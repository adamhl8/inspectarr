import "node_modules/@adamhl8/configs/dist/configs/justfile.base.just"

build: && lint
    ./generate-schemas.sh
