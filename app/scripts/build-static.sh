#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$project_dir/dist"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"
cp "$project_dir/index.html" "$dist_dir/index.html"
cp "$project_dir/styles.css" "$dist_dir/styles.css"
cp "$project_dir/app.js" "$dist_dir/app.js"
mkdir -p "$dist_dir/data" "$dist_dir/core"
cp "$project_dir/data/scene-data.js" "$dist_dir/data/scene-data.js"
cp "$project_dir/data/mask-data.js" "$dist_dir/data/mask-data.js"
cp "$project_dir/core/state.js" "$dist_dir/core/state.js"
cp "$project_dir/core/visibility.js" "$dist_dir/core/visibility.js"
cp "$project_dir/core/validation.js" "$dist_dir/core/validation.js"
cp "$project_dir/core/fingerprint.js" "$dist_dir/core/fingerprint.js"
cp "$project_dir/core/finishes.js" "$dist_dir/core/finishes.js"
mkdir -p "$dist_dir/assets"
cp -a "$project_dir/assets/." "$dist_dir/assets/"
