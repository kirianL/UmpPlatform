import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 1);
}

if (process.env.CONVEX_DEPLOY_KEY) {
  run("npx", ["convex", "deploy", "--cmd", "next build"]);
} else {
  run("npx", ["next", "build"]);
}
