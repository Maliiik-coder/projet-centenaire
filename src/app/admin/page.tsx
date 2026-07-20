import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackOffice } from "@/features/admin/AdminBackOffice";
import { createAdminBackOfficeData } from "@/features/admin/adminBackOfficeModel";
import { isAdminPreviewEnabled } from "@/lib/admin/serverPreviewAccess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Back-office Haru - Maquette",
  description:
    "Maquette locale non branchée du futur back-office opérationnel Haru.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AdminPage() {
  if (!isAdminPreviewEnabled()) {
    notFound();
  }

  return <AdminBackOffice data={createAdminBackOfficeData()} />;
}
