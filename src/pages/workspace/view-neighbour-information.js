// Апп-аас хасагдсан функцийн хуучин хаяг (CEO 10-27 «А + redirect») → /post
import React from "react";
import { Redirect } from "@docusaurus/router";

export default function OldPage() {
  return <Redirect to="/post" />;
}
