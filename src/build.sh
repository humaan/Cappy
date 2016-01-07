#!/usr/bin/env bash

OUTPUT="extension/"

# remove previous dist
rm -fr $OUTPUT

# copy css
mkdir -p "$OUTPUT/css"
cp css/*.css "$OUTPUT/css"

# copy images
cp -r images $OUTPUT

# copy js
cp -r js $OUTPUT

# copy specific files from node_modules
mkdir -p "$OUTPUT/node_modules/jquery/dist"
cp node_modules/jquery/dist/jquery.min.* "$OUTPUT/node_modules/jquery/dist"
mkdir -p "$OUTPUT/node_modules/jquery-tags-input/dist"
cp node_modules/jquery-tags-input/dist/*.min.* "$OUTPUT/node_modules/jquery-tags-input/dist"

#copy other root files
cp manifest.json $OUTPUT
cp options.html $OUTPUT
cp popup.html $OUTPUT

# rename the app name in the manifest
sed -i '' -e 's/"Cappy\.Dev"/"Cappy"/g' "$OUTPUT/manifest.json"
# replace the dev icon with the live one
sed -i '' -e 's/icon.dev.png/icon.png/g' "$OUTPUT/manifest.json"
