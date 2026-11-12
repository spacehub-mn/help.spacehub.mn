// @ts-check
// KidSpace-ийн тусдаа гарын авлага (help.kidspace.mn). Spacehub-ийн сайтаас тусдаа siteDir тул
// ../src/theme (Spacehub-ийн Root, хайлт), Spacehub-ийн цэс, хөл энд орохгүй.
// Агуулгын эх: ../docs/kidspace → scripts/prep-docs.mjs нь «/kidspace» угтварыг хасаж ./docs руу хуулна.

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "KidSpace туслах",
  tagline: "KidSpace — цэцэрлэгийн удирдлагын тусламж",
  favicon: "img/favicon.ico",
  url: "https://help.kidspace.mn",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  trailingSlash: false,
  i18n: { defaultLocale: "mn", locales: ["mn"] },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "docs",
          sidebarPath: require.resolve("./sidebars.js"),
          routeBasePath: "/",
          beforeDefaultRemarkPlugins: [require("../plugins/step-numbers")],
        },
        blog: false,
        theme: { customCss: require.resolve("./src/css/custom.css") },
        sitemap: { changefreq: "weekly", filename: "sitemap.xml" },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { defaultMode: "light", respectPrefersColorScheme: true },
      navbar: {
        title: "KidSpace туслах",
        logo: { alt: "KidSpace", src: "img/kidspace-mark.png", width: 30, height: 30 },
        items: [{ type: "docSidebar", sidebarId: "kidspace", position: "left", label: "🏫 Эрхлэгч, менежерийн тусламж" }],
      },
      footer: {
        style: "light",
        links: [
          {
            title: "KidSpace",
            items: [{ label: "Эрхлэгчийн самбар", href: "https://app.kidspace.mn" }],
          },
        ],
        copyright: `© ${new Date().getFullYear()} KidSpace — цэцэрлэгийн удирдлагын систем.`,
      },
    }),
};

module.exports = config;
