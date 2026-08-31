import { redirect } from "next/navigation";
import { SITE } from "@/config/site";

export default function RootPage() {
  redirect(`/${SITE.defaultLocale}`);
}
