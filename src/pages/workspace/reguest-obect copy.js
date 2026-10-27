// Апп-аас хасагдсан функцийн хуучин хаяг (CEO 10-27 «А + redirect») → /dashboard/reguest-write
import React from "react";
import { Redirect } from "@docusaurus/router";

export default function OldPage() {
  return <Redirect to="/dashboard/reguest-write" />;
}
