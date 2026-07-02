#!/usr/bin/env bash

nubx openapi-typescript https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json -o ./src/generated/radarr-schema.d.ts
nubx openapi-typescript https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json -o ./src/generated/sonarr-schema.d.ts
