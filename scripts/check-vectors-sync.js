const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const specPath = path.join(rootDir, "spec", "vectors.json");
const specVersion = JSON.parse(fs.readFileSync(specPath, "utf8")).spec_version;

const packages = [
  path.join("packages", "spec", "package.json"),
  path.join("packages", "core-ts", "package.json"),
  // Note: core-go and core-dart use different versioning files, but for MVP we track them here or in their metadata.
  // Note: core-go and core-dart use different versioning files, but for MVP we track them here or in their metadata.
];

let hasError = false;

packages.forEach((filePath) => {
  const absolutePath = path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) return;

  const pkg = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (pkg.version !== specVersion) {
    console.error(
      "Mismatch in " +
        filePath +
        ": expected " +
        specVersion +
        ", found " +
        pkg.version,
    );
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
}

console.log("All packages are in sync with spec_version: " + specVersion);
