import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const spec = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/spec" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
});

const reports = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/reports" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
});

export const collections = { spec, reports };
