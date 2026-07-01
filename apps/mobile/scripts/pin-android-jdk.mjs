// Pins the Android Gradle build to the JDK in JAVA_HOME.
//
// Why this exists: android/ is a generated folder (gitignored, rebuilt by
// `expo prebuild`), so any manual edit to android/gradle.properties is wiped on
// the next prebuild. This project must build with JDK 17 — JDK 26 fails the
// androidJdkImage jlink transform and the NDK/CMake configure step. Run this
// after every prebuild to bake `org.gradle.java.home` back in from JAVA_HOME,
// keeping local builds deterministic regardless of which shell/IDE launches them.
//
// It reads JAVA_HOME rather than hard-coding a path so the script stays portable
// across machines. It refuses to pin anything other than JDK 17.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const gradleProps = join(scriptDir, "..", "android", "gradle.properties");

const javaHome = process.env.JAVA_HOME;
if (!javaHome) {
  console.error(
    "[pin-android-jdk] JAVA_HOME is not set. Point it at a JDK 17 install and re-run."
  );
  process.exit(1);
}

// Parse the JDK major version from the `release` file that ships in every JDK home.
const releaseFile = join(javaHome, "release");
if (!existsSync(releaseFile)) {
  console.error(`[pin-android-jdk] No 'release' file under JAVA_HOME (${javaHome}); is it a JDK?`);
  process.exit(1);
}
const versionMatch = readFileSync(releaseFile, "utf8").match(/JAVA_VERSION="(\d+)/);
const major = versionMatch ? Number(versionMatch[1]) : NaN;
if (major !== 17) {
  console.error(
    `[pin-android-jdk] JAVA_HOME points at JDK ${major || "?"} (${javaHome}). ` +
      "This project builds only with JDK 17 — set JAVA_HOME to a JDK 17 install."
  );
  process.exit(1);
}

if (!existsSync(gradleProps)) {
  console.error(
    `[pin-android-jdk] ${gradleProps} not found. Run 'expo prebuild -p android' first.`
  );
  process.exit(1);
}

const pinPath = javaHome.replace(/\\/g, "/");
const pinLine = `org.gradle.java.home=${pinPath}`;

const lines = readFileSync(gradleProps, "utf8").split(/\r?\n/);
const kept = lines.filter((l) => !l.startsWith("org.gradle.java.home="));
// Drop a trailing blank line so we append cleanly, then re-add one.
while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
kept.push(
  "",
  "# Pinned by scripts/pin-android-jdk.mjs — JDK 17 is required (JDK 26 breaks jlink/NDK).",
  pinLine,
  ""
);
writeFileSync(gradleProps, kept.join("\n"), "utf8");

console.log(`[pin-android-jdk] Pinned org.gradle.java.home to ${pinPath}`);
