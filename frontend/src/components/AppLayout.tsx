import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

/** 真實 RWD 版面：桌機頂部導覽列，手機底部 tab bar。非手機外框。 */
export function AppLayout({
  title,
  nav,
  onLogout,
  children,
}: {
  title: string;
  nav: NavItem[];
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-blue-800 text-white">
        <div className="container flex h-14 items-center gap-2">
          <div className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              寶
            </span>
            <span className="hidden sm:inline">{title}</span>
          </div>
          <nav className="ml-6 hidden flex-1 items-center gap-1 sm:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-white text-blue-800" : "text-blue-100 hover:bg-white/10",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={onLogout}
            className="ml-auto rounded-md px-3 py-1.5 text-sm text-blue-100 hover:bg-white/10"
          >
            登出
          </button>
        </div>
      </header>

      <main className="container max-w-3xl py-5 pb-24 sm:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white sm:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 text-xs",
                isActive ? "text-blue-700" : "text-slate-500",
              )
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-4 text-xl font-bold text-slate-900">{children}</h1>;
}

export function Spinner({ label = "載入中…" }: { label?: string }) {
  return <p className="py-10 text-center text-slate-400">{label}</p>;
}

export function EmptyState({ icon = "📭", text }: { icon?: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
      <span className="text-3xl">{icon}</span>
      <p>{text}</p>
    </div>
  );
}
