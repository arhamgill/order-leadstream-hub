// ============================================================================
// Production build — builds everything for the single-service deploy.
//
//   1. API server  -> artifacts/api-server/dist/index.mjs
//   2. Storefront  -> artifacts/leadstream-hub/dist/public   (base "/")
//   3. Admin panel -> artifacts/admin-dashboard/dist/public  (base "/admin/")
//
// The API server then serves (2) at "/" and (3) at "/admin".
// Run with:  node build.mjs   (this is what Render's Build Command runs)
// ============================================================================
import { spawnSync } from "node:child_process";

function run(label, args, extraEnv = {}) {
  console.log(`\n→ ${label}`);
  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    shell: true, // needed so Windows resolves pnpm.cmd; harmless on Linux
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    console.error(`✗ Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("Building API server", ["--filter", "@workspace/api-server", "run", "build"]);
run("Building storefront (base /)", ["--filter", "@workspace/leadstream-hub", "run", "build"], {
  BASE_PATH: "/",
});
run("Building admin dashboard (base /admin/)", ["--filter", "@workspace/admin-dashboard", "run", "build"], {
  BASE_PATH: "/admin/",
});

console.log("\n✓ Production build complete. Start with: node artifacts/api-server/dist/index.mjs");
