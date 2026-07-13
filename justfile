import "node_modules/@adamhl8/configs/dist/configs/justfile.base.just"

generate-schemas:
    ./generate-schemas.sh

build: generate-schemas _build

compile-flags := "--compile --production --minify --sourcemap"

build-binaries:
    bun build {{ compile-flags }} --target=bun-windows-x64 --outfile=bin/inspectarr-windows-x64.exe src/index.ts
    bun build {{ compile-flags }} --target=bun-darwin-x64 --outfile=bin/inspectarr-macos-x64 src/index.ts
    bun build {{ compile-flags }} --target=bun-darwin-arm64 --outfile=bin/inspectarr-macos-arm64 src/index.ts
    bun build {{ compile-flags }} --target=bun-linux-x64-musl --outfile=bin/inspectarr-linux-x64 src/index.ts
    bun build {{ compile-flags }} --target=bun-linux-arm64-musl --outfile=bin/inspectarr-linux-arm64 src/index.ts
