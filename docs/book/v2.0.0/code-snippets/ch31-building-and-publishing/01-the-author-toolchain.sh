npm install -g @sharpee/devkit   # one-time
# scaffold src/index.ts, package.json, tsconfig.json
sharpee init my-game -y
cd my-game && npm install        # pull the platform from npm
# compile src/ → dist/, emit the .sharpee bundle
sharpee build
