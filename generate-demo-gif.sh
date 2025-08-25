#!/usr/bin/env bash

echo -e '#!/bin/bash\nbun ./src/index.ts radarr '\''source == bluray && resolution ^= 1920 && (title i^= "star wars" || title i^= p) | SORT title | EXCLUDE m rs sz'\''' > inspectarr
chmod +x inspectarr
export PATH=$(pwd):$PATH
vhs demo.tape
rm inspectarr
