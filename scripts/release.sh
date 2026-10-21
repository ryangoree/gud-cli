#!/bin/bash
set -e
cp README.md packages/cli/README.md
bun run build
changeset publish