// Sends a signed APK to Myket as a new release and asks Myket to review it, through the
// developer panel API: https://myket.ir/docs/technical/services/publish-release/
//
//   node tools/myket-release.mjs <apk> --version 1.33.0 --code 1033000 --changelog notes.json
//
// Env:
//   MYKET_ACCESS_TOKEN    the app's validation token (Myket developer panel -> the app)
//   MYKET_PACKAGE_NAME    the package name (default: com.jollypanda.mini_sumo)
//   MYKET_AUTO_PUBLISH    "false" (default): you publish it in the panel once approved;
//                         "true": published as soon as Myket approves it
//
// Steps: skip if Myket already has this versionCode (in review or approved) -> write the
// bundle's notes (this creates the bundle, or edits the one left by a failed run) -> upload the
// APK -> commit it for review. The changelog: { fa, en } from tools/bazaar-notes.mjs.
import { existsSync, openAsBlob, readFileSync } from "node:fs";

const pkgName = (process.env.MYKET_PACKAGE_NAME || process.env.MYKET_PACKAGE_NAME).trim();
// MYKET_API_URL is only for testing against a mock.
const API = `${process.env.MYKET_API_URL || "https://developer.myket.ir/api/partners/applications"}/${pkgName}/release-bundle`;
const args = process.argv.slice(2);
const apk = args[0]?.startsWith("--") ? undefined : args[0];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const version = opt("version");
const code = Number(opt("code"));
const changelogFile = opt("changelog");
const token = (process.env.MYKET_ACCESS_TOKEN ?? "").trim();
const autoPublish = (process.env.MYKET_AUTO_PUBLISH ?? "false").trim().toLowerCase() === "true";

const fail = (message) => {
  console.log(`::error::${message}`);
  process.exit(1);
};
if (!token) fail("MYKET_ACCESS_TOKEN is not set.");
if (!apk || !existsSync(apk)) fail(`APK not found: ${apk}`);
if (!version || !Number.isFinite(code) || code <= 0) fail("Pass --version and --code.");
if (!changelogFile || !existsSync(changelogFile)) fail("Pass --changelog (the notes checked by tools/bazaar-notes.mjs).");
const notes = JSON.parse(readFileSync(changelogFile, "utf8"));
if (!String(notes.fa ?? "").trim() || !String(notes.en ?? "").trim()) fail("The release notes are empty.");

/** One API call; retries a few times when Myket says "too many requests". */
async function call(method, path = "", body) {
  for (let attempt = 1; ; attempt++) {
    const headers = { "X-Access-Token": token };
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(API + path, { method, headers, body: payload });
    const text = await res.text();
    if (res.status === 429 && attempt < 5) {
      console.log(`Myket says too many requests; waiting ${attempt * 20} s…`);
      await new Promise((r) => setTimeout(r, attempt * 20_000));
      continue;
    }
    return { status: res.status, ok: res.ok, text };
  }
}

const why = (res) => `HTTP ${res.status}: ${res.text.slice(0, 300)}`;

// 1. Already on Myket (a re-run, or the version wasn't bumped): nothing to do. The docs don't
// spell out the list's fields, so any versionCode in the answer counts.
for (const status of ["WaitingForApproval", "Approved"]) {
  const list = await call("GET", `?status=${status}&limit=20`);
  if (!list.ok) fail(`Couldn't list the releases: ${why(list)}`);
  const codes = [...list.text.matchAll(/"version_?code"\s*:\s*(\d+)/gi)].map((m) => Number(m[1]));
  if (Math.max(0, ...codes) >= code) {
    console.log(`::notice::Myket already has versionCode ${Math.max(...codes)} (${status}); not sending ${version} (${code}).`);
    process.exit(0);
  }
}

// 2. The bundle and its notes.
const bundle = await call("PUT", "", {
  title: `${process.env.GAME_NAME || "Game"} ${version}`,
  stagedRolloutPercent: 100,
  translationInfos: [
    { description: notes.en, language: "en" },
    { description: notes.fa, language: "fa" },
  ],
});
if (!bundle.ok) fail(`Couldn't create the release: ${why(bundle)}`);
console.log("Release created.");

// 3. The APK (Myket's example sends the file in a field with no name).
const form = new FormData();
form.append("", await openAsBlob(apk, { type: "application/vnd.android.package-archive" }), apk.split(/[\\/]/).pop());
const uploaded = await call("PUT", "/upload", form);
if (!uploaded.ok) fail(`Couldn't upload the APK: ${why(uploaded)}`);
console.log("APK uploaded.");

// 4. Ask Myket to review it.
const committed = await call("POST", "/commit", {
  isManualPublish: !autoPublish,
  message: `${process.env.GAME_NAME || "Game"} ${version} (versionCode ${code}), sent automatically by GitHub Actions.`,
});
if (!committed.ok) fail(`Couldn't send the release for review: ${why(committed)}`);
console.log(
  `::notice::${process.env.GAME_NAME || "Game"} ${version} is with Myket for review${autoPublish ? "; it's published as soon as it's approved" : "; publish it in the panel once approved"}.`,
);

