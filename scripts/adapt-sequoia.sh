SRC_DIR=adapter-src
BUILD_DIR=build

cp $SRC_DIR/* $BUILD_DIR
rm $BUILD_DIR/index.js

echo "Adapter tweaked successfully"