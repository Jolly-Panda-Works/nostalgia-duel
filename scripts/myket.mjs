// Turns the generated Android project into the Myket build: Myket's billing library, the Myket
// plugin, its store settings, the public key as a string resource and the <queries> entry for the
// Myket app (Android 11+). Settings in myket.config.json; MYKET_PUBLIC_KEY (env) overrides the key.
// Without a key the build still works, but buying coins stays off.
// Run after `cap add/sync android`. Don't combine with play-games.mjs or bazaar.mjs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const settings = JSON.parse(readFileSync(new URL("myket.config.json", root), "utf8"));
const publicKey = (process.env.MYKET_PUBLIC_KEY || settings.publicKey || "").trim();
if (publicKey && !/^[A-Za-z0-9+/=]{100,}$/.test(publicKey)) {
  console.error("The Myket public key is malformed (myket.config.json or MYKET_PUBLIC_KEY).");
  process.exit(1);
}
if (!publicKey) console.log("::warning::No Myket public key: buying coins is off in this build.");
if (!existsSync(new URL("android/app/build.gradle", root))) {
  console.error("android/ not found. Run `npx cap add android` first.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(new URL("capacitor.config.json", root), "utf8"));
const pkg = config.appId;
const read = (path) => readFileSync(new URL(path, root), "utf8");
const write = (path, text) => writeFileSync(new URL(path, root), text);

// Plugin + MainActivity (the Bazaar build's, with this plugin)
const javaDir = `android/app/src/main/java/${pkg.replaceAll(".", "/")}/`;
mkdirSync(new URL(javaDir, root), { recursive: true });
write(`${javaDir}MyketPlugin.java`, read("native/MyketPlugin.java").replace("__PACKAGE__", pkg));
write(
  `${javaDir}MainActivity.java`,
  read("native/MainActivity.bazaar.java").replace("__PACKAGE__", pkg).replace("BazaarPlugin.class", "MyketPlugin.class").replace("Cafe Bazaar build", "Myket build"),
);

// Myket's Maven repository, after the standard ones
let rootGradle = read("android/build.gradle");
if (!rootGradle.includes("maven.myket.ir")) {
  rootGradle = rootGradle.replace(
    /(allprojects\s*\{\s*repositories\s*\{[\s\S]*?)(\n\s*\})/,
    `$1\n        maven { url "https://maven.myket.ir"; content { includeGroup "ir.myket" } }$2`,
  );
  write("android/build.gradle", rootGradle);
}

// The library and where it finds the Myket app
let appGradle = read("android/app/build.gradle");
if (!appGradle.includes("ir.myket:billing")) {
  appGradle = appGradle.replace(/dependencies\s*\{/, (m) => `${m}\n    implementation "ir.myket:billing:${settings.billingVersion}"`);
}
if (!appGradle.includes("marketApplicationId")) {
  appGradle = appGradle.replace(
    /defaultConfig\s*\{/,
    (m) =>
      `${m}\n        manifestPlaceholders += [marketApplicationId: "ir.mservices.market", marketBindAddress: "ir.mservices.market.InAppBillingService.BIND", marketPermission: "ir.mservices.market.BILLING"]`,
  );
}
write("android/app/build.gradle", appGradle);

// Public key resource
let strings = read("android/app/src/main/res/values/strings.xml");
if (!strings.includes("myket_public_key")) {
  strings = strings.replace("</resources>", `    <string name="myket_public_key" translatable="false">${publicKey}</string>\n</resources>`);
  write("android/app/src/main/res/values/strings.xml", strings);
}

// Android 11+: let the app see the Myket client
let manifest = read("android/app/src/main/AndroidManifest.xml");
if (!manifest.includes("ir.mservices.market")) {
  manifest = manifest.replace(/<application/, `<queries>\n        <package android:name="ir.mservices.market" />\n    </queries>\n\n    <application`);
  write("android/app/src/main/AndroidManifest.xml", manifest);
}

console.log(`Myket added (billing ${settings.billingVersion}, package ${pkg}, ${publicKey ? "with" : "without"} a public key).`);
