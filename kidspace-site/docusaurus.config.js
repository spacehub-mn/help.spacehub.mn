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
      // Холбоос хуваалцахад гарах зураг (og:image) — kidspace-site/static/img/social-card.jpg
      image: "img/social-card.jpg",
      navbar: {
        title: "KidSpace туслах",
        logo: { alt: "KidSpace", src: "img/kidspace-mark.png", width: 30, height: 30 },
        items: [
          { type: "docSidebar", sidebarId: "kidspace", position: "left", label: "🏫 Эрхлэгч, менежерийн тусламж" },
          // help.spacehub.mn-ийн «Түрээслэгч үү? →»-тэй ижил: нөгөө хэрэглэгч (багш) өөрийн хуудас руу шууд
          { to: "/role/bagsh", position: "right", label: "Багш уу? →", className: "role-switch" },
        ],
      },
      // help.spacehub.mn-тэй ижил бараан footer. Холбоо барих = kidspace.mn-ийн албан footer (landing-pages Footer.svelte).
      footer: {
        style: "dark",
        links: [
          {
            title: "KidSpace",
            items: [
              { label: "Цахим хуудас", href: "https://kidspace.mn" },
              { label: "Эрхлэгчийн самбар", href: "https://app.kidspace.mn" },
            ],
          },
          {
            title: "Эхлэх",
            items: [
              { label: "Эхний 7 хоног", to: "/nevtruulelt" },
              { label: "Түгээмэл асуулт", to: "/asuult/tolbor" },
              { label: "Нэр томьёо", to: "/glossary" },
            ],
          },
          {
            title: "Холбоо барих",
            items: [
              { label: "+976 7777 4242", href: "tel:+97677774242" },
              { label: "+976 8888 5516", href: "tel:+97688885516" },
              { label: "order@spacehub.mn", href: "mailto:order@spacehub.mn?subject=%5BKidspace%5D" },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} KidSpace — цэцэрлэгийн удирдлагын систем.`,
      },
    }),
};

module.exports = config;
