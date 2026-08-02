import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/today" className="px-4 py-2 text-sm">
          Dnes
        </Link>
        <Link href="/assign" className="px-4 py-2 text-sm">
          Zadat
        </Link>
        <Link href="/shop" className="px-4 py-2 text-sm">
          Obchod
        </Link>
      </nav>
    </div>
  );
}
