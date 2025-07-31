#!/bin/bash
set -e
cp README.md packages/cli/README.md
yarn build
changeset publish