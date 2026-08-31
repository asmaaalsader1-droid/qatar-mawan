import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const now = new Date();
  const staticPages = [
    "",
    "/candidates",
    "/services",
    "/about",
    "/contact",
    "/blog",
    "/terms",
    "/privacy",
  ];
  return staticPages.map((path) => ({
    url: `${base}/ar${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
