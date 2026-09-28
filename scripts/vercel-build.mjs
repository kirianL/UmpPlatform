import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const deployKey = process.env.CONVEX_DEPLOY_KEY || "";

if (deployKey.startsWith("dev:")) {
  run("npx", ["convex", "dev", "--once"]);
  run("npx", ["next", "build"]);
} else if (deployKey) {
  run("npx", ["convex", "deploy", "--cmd", "next build"]);
} else {
  run("npx", ["next", "build"]);
}
