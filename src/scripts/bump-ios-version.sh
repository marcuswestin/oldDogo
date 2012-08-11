set -e

version=$(node src/scripts/bump-ios-version.js $1)
echo $version
git add src/client/ios/dogo/dogo-Info.plist
git commit -m "ios-version $version"
