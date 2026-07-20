import type { ReactNode } from "react";
import { HaruModuleRouteShell } from "@/components/centenaire/HaruModuleRouteShell";

export default function SportLayout({ children }: { children: ReactNode }) {
  return <HaruModuleRouteShell>{children}</HaruModuleRouteShell>;
}
