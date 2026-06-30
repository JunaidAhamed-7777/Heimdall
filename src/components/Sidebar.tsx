import logo from "../../logo.png";
import { User as UserIcon } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  onProfileClick: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onProfileClick }: SidebarProps) {
  const navItems = [
    { id: "agenda", label: "Agenda", icon: "calendar_today" },
    { id: "habits", label: "Habits", icon: "local_fire_department" },
    { id: "actions", label: "Actions", icon: "bolt" },
    { id: "advisor", label: "Chat", icon: "psychology" },
  ];

  return (
      <aside className="hidden md:flex flex-col h-screen pt-stack-lg pb-0 bg-surface-container dark:bg-surface-container h-full w-52 left-0 fixed border-r border-outline-variant z-50">
      <div className="pl-4 pr-6 mb-stack-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <img
              src={logo}
              alt="Heimdall Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tighter leading-none">
              HEIMDALL
            </h2>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 pl-4 py-3 transition-all cursor-pointer ${
              activeTab === item.id
                ? "text-primary border-l-2 border-primary bg-secondary-container/10"
                : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-caps text-label-caps">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="px-4 mt-auto pb-4">
        <button
          onClick={onProfileClick}
          className="w-full mt-2 flex items-center gap-3 px-2 py-3 border-t border-outline-variant/30 text-left hover:bg-surface-variant/30 rounded-lg transition-all cursor-pointer"
        >
          {user ? (
            <>
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary shrink-0">
                {user.photoURL ? (
                  <img
                    className="w-full h-full object-cover"
                    src={user.photoURL}
                    alt={user.displayName || "User portrait"}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-variant flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-on-surface-variant" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user.displayName || "User"}</p>
                <p className="text-[10px] text-on-surface-variant truncate">
                  {user.email || ""}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-surface-variant/40 flex items-center justify-center shrink-0 border border-outline/30">
                <UserIcon className="w-4 h-4 text-on-surface-variant" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">Guest</p>
                <p className="text-[9px] text-primary font-bold tracking-tight animate-pulse uppercase">
                  Sign In To Save Your Data
                </p>
              </div>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
