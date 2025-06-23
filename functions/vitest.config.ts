import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true, // Optional: to use Jest-like globals (describe, it, expect)
    exclude: [...configDefaults.exclude, "lib"],
  },
});
