npm install -g @sharpee/devkit   # one-time
sharpee init my-game -y          # scaffold src/index.ts, package.json, tsconfig.json
cd my-game && npm install        # pull the platform from npm
sharpee build                    # compile src/ → dist/, emit the .sharpee bundle
