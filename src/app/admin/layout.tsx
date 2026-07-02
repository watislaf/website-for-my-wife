import { Sidebar } from "@/components/admin/Sidebar";
import { CommandK } from "@/components/admin/CommandK";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">{children}</main>
      <CommandK />
    </div>
  );
}
