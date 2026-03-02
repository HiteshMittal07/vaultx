import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/swap", "/borrow"],
        disallow: ["/api/", "/dashboard/", "/policy/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx-demo.vercel.app"}/sitemap.xml`,
  };
}
