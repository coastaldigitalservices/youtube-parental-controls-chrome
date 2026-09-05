import { spawnSync } from "node:child_process";
const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
if (build.status) process.exit(build.status);
console.log(`\nA deterministic automated extension capture is not enabled because this repository has no browser-test dependency.\nCapture the real UI with the short procedure in store/README.md, then replace store/assets/screenshot-1.png.\n`);
