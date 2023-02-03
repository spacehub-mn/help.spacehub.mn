import React from "react";
import "./app_store_badges.css";

const AppStoreBadges = () => (
  <ul className="AppStoreBadges">
    <li>
      <a
        className="storeLink gplay"
        href="https://play.google.com/store/apps/details?id=mn.spacehub.main.spacehub"
        target="_blank"
        rel="noreferrer">
        <img
          alt="Google Play-ээс авах"
          src="https://play.google.com/intl/en_us/badges/static/images/badges/mn_badge_web_generic.png"
          loading="lazy"
        />
      </a>
    </li>
    <li>
      <a
        className="storeLink apple"
        href="https://apple.co/3MCEoqw"
        target="_blank"
        rel="noreferrer">
        <img
          src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1634688000&h=31d240d22c97a1fc66a6cb73c4ae7d84"
          alt="Download on the App Store"
          // style="border-radius: 13px; width: 250px; height: 83px;"
          loading="lazy"
        />
      </a>
    </li>
  </ul>
);

export default AppStoreBadges;
