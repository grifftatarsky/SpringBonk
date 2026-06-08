#!/bin/sh
set -e

build() {
  echo "Building $1..."
  ng build "$2"
  echo "$1 complete."
}

build "Akira" "akira-ng"
build "Oozengine" "ooze"

echo "All builds green."
