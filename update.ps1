# simplified-setup.ps1
# Create basic structure for Sharpee project without recursive scripts

# Create directory structure if it doesn't exist
$directories = @(
    "packages/core",
    "packages/standard-library", 
    "packages/extensions/mirrors",
    "packages/extensions/conversation",
    "packages/extensions/time",
    "packages/extensions/abilities",
    "packages/cli",
    "packages/web-client",
    "packages/dev-tools",
    "stories/reflections"
)

Write-Host "Creating directory structure..."
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Creating directory: $dir"
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Root package.json with simple scripts (no recursion)
$rootPackageJson = @'
{
  "name": "sharpee",
  "version": "0.1.0",
  "description": "A TypeScript-based Interactive Fiction Engine",
  "private": true,
  "workspaces": [
    "packages/core",
    "packages/standard-library",
    "packages/extensions/*",
    "packages/cli",
    "packages/web-client",
    "packages/dev-tools",
    "stories/*"
  ],
  "scripts": {
    "clean": "rimraf \"packages/*/dist\" \"packages/extensions/*/dist\" \"stories/*/dist\"",
    "build": "lerna run build",
    "test": "lerna run test"
  },
  "devDependencies": {
    "lerna": "^7.4.1",
    "typescript": "^5.2.2",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating root package.json..."
Set-Content -Path "package.json" -Value $rootPackageJson -Encoding UTF8
Write-Host "Done."

# lerna.json - Updated for Lerna v7+
$lernaJson = @'
{
  "version": "0.1.0",
  "npmClient": "npm",
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "useWorkspaces": true
}
'@

Write-Host "Creating lerna.json..."
Set-Content -Path "lerna.json" -Value $lernaJson -Encoding UTF8
Write-Host "Done."

# Individual package.json files

# Core package.json
$corePackageJson = @'
{
  "name": "@sharpee/core",
  "version": "0.1.0",
  "description": "Core engine components for Sharpee IF system",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for core..."
Set-Content -Path "packages/core/package.json" -Value $corePackageJson -Encoding UTF8

# Standard Library package.json
$stdLibPackageJson = @'
{
  "name": "@sharpee/standard-library",
  "version": "0.1.0",
  "description": "Standard library for interactive fiction physics",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for standard-library..."
Set-Content -Path "packages/standard-library/package.json" -Value $stdLibPackageJson -Encoding UTF8

# Mirrors Extension package.json
$mirrorsExtensionJson = @'
{
  "name": "@sharpee/extension-mirrors",
  "version": "0.1.0",
  "description": "Mirror portal extension for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for extension-mirrors..."
Set-Content -Path "packages/extensions/mirrors/package.json" -Value $mirrorsExtensionJson -Encoding UTF8

# Conversation Extension package.json
$conversationExtensionJson = @'
{
  "name": "@sharpee/extension-conversation",
  "version": "0.1.0",
  "description": "Enhanced conversation system extension for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for extension-conversation..."
Set-Content -Path "packages/extensions/conversation/package.json" -Value $conversationExtensionJson -Encoding UTF8

# Time Extension package.json
$timeExtensionJson = @'
{
  "name": "@sharpee/extension-time",
  "version": "0.1.0",
  "description": "Time management extension for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for extension-time..."
Set-Content -Path "packages/extensions/time/package.json" -Value $timeExtensionJson -Encoding UTF8

# Abilities Extension package.json
$abilitiesExtensionJson = @'
{
  "name": "@sharpee/extension-abilities",
  "version": "0.1.0",
  "description": "Character abilities extension for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for extension-abilities..."
Set-Content -Path "packages/extensions/abilities/package.json" -Value $abilitiesExtensionJson -Encoding UTF8

# CLI package.json
$cliPackageJson = @'
{
  "name": "@sharpee/cli",
  "version": "0.1.0",
  "description": "Command line tools for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for cli..."
Set-Content -Path "packages/cli/package.json" -Value $cliPackageJson -Encoding UTF8

# Web Client package.json
$webClientPackageJson = @'
{
  "name": "@sharpee/web-client",
  "version": "0.1.0",
  "description": "React-based web client for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "@types/react": "^18.2.25",
    "@types/react-dom": "^18.2.10",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for web-client..."
Set-Content -Path "packages/web-client/package.json" -Value $webClientPackageJson -Encoding UTF8

# Dev Tools package.json
$devToolsPackageJson = @'
{
  "name": "@sharpee/dev-tools",
  "version": "0.1.0",
  "description": "Development tools for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for dev-tools..."
Set-Content -Path "packages/dev-tools/package.json" -Value $devToolsPackageJson -Encoding UTF8

# Reflections Story package.json
$reflectionsPackageJson = @'
{
  "name": "reflections",
  "version": "0.1.0",
  "description": "Through mirrors darkly - an interactive fiction adventure",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "clean": "rimraf dist"
  },
  "dependencies": {
    "@sharpee/core": "*",
    "@sharpee/extension-mirrors": "*",
    "@sharpee/extension-abilities": "*"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "ts-jest": "^29.1.1",
    "rimraf": "^5.0.5"
  },
  "author": "",
  "license": "MIT"
}
'@

Write-Host "Creating package.json for reflections..."
Set-Content -Path "stories/reflections/package.json" -Value $reflectionsPackageJson -Encoding UTF8

# Create basic tsconfig.json
$tsconfigBase = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  }
}
'@

Write-Host "Creating tsconfig.base.json..."
Set-Content -Path "tsconfig.base.json" -Value $tsconfigBase -Encoding UTF8

$tsconfigPackage = @'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
'@

$tsconfigExtension = @'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
'@

$tsconfigStory = @'
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
'@

# Create tsconfig.json files
Write-Host "Creating tsconfig.json files for packages..."
Set-Content -Path "packages/core/tsconfig.json" -Value $tsconfigPackage -Encoding UTF8
Set-Content -Path "packages/standard-library/tsconfig.json" -Value $tsconfigPackage -Encoding UTF8
Set-Content -Path "packages/cli/tsconfig.json" -Value $tsconfigPackage -Encoding UTF8
Set-Content -Path "packages/web-client/tsconfig.json" -Value $tsconfigPackage -Encoding UTF8
Set-Content -Path "packages/dev-tools/tsconfig.json" -Value $tsconfigPackage -Encoding UTF8

Write-Host "Creating tsconfig.json files for extensions..."
Set-Content -Path "packages/extensions/mirrors/tsconfig.json" -Value $tsconfigExtension -Encoding UTF8
Set-Content -Path "packages/extensions/conversation/tsconfig.json" -Value $tsconfigExtension -Encoding UTF8
Set-Content -Path "packages/extensions/time/tsconfig.json" -Value $tsconfigExtension -Encoding UTF8
Set-Content -Path "packages/extensions/abilities/tsconfig.json" -Value $tsconfigExtension -Encoding UTF8

Write-Host "Creating tsconfig.json for stories..."
Set-Content -Path "stories/reflections/tsconfig.json" -Value $tsconfigStory -Encoding UTF8

# Create src directories
Write-Host "Creating src directories..."
foreach ($dir in $directories) {
    if ($dir -ne "packages/extensions") {
        $srcDir = "$dir/src"
        if (-not (Test-Path $srcDir)) {
            Write-Host "Creating directory: $srcDir"
            New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
        }
    }
}

# Create basic index.ts files
$indexContent = @'
/**
 * @file Index file
 */

export const version = '0.1.0';
'@

Write-Host "Creating index.ts files..."
Set-Content -Path "packages/core/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/standard-library/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/cli/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/web-client/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/dev-tools/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/extensions/mirrors/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/extensions/conversation/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/extensions/time/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "packages/extensions/abilities/src/index.ts" -Value $indexContent -Encoding UTF8
Set-Content -Path "stories/reflections/src/index.ts" -Value $indexContent -Encoding UTF8

# Create root tsconfig.json
$rootTsconfig = @'
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/standard-library" },
    { "path": "packages/cli" },
    { "path": "packages/web-client" },
    { "path": "packages/dev-tools" },
    { "path": "packages/extensions/mirrors" },
    { "path": "packages/extensions/conversation" },
    { "path": "packages/extensions/time" },
    { "path": "packages/extensions/abilities" },
    { "path": "stories/reflections" }
  ]
}
'@

Write-Host "Creating root tsconfig.json..."
Set-Content -Path "tsconfig.json" -Value $rootTsconfig -Encoding UTF8

Write-Host "`nSetup completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "1. Run 'npm install' to install dependencies"
Write-Host "2. Run 'npm run build' to build all packages"