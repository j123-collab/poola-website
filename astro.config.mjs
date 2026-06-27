import { defineConfig } from "astro/config";

const isGitHubPages = process.env.DEPLOY_TARGET === "github-pages";

export default defineConfig({
  site: isGitHubPages ? "https://j123-collab.github.io" : undefined,
  base: isGitHubPages ? "/poola-website" : "/",
  output: "static",
  build: {
    format: "file"
  }
});
