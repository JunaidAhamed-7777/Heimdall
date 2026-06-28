import logo from "../../logo.png";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: "agenda", label: "Agenda", icon: "calendar_today" },
    { id: "actions", label: "Actions", icon: "bolt" },
    { id: "advisor", label: "Advisor", icon: "psychology" },
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

      <div className="px-4 mt-auto pb-0">
        
        <div className="mt-2 flex items-center gap-3 px-2 py-3 border-t border-outline-variant/30">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnN6Sv6hC3N2MuXyYRgp3p-Xhmp0TdT2K3n63IApCqaBi20wSdaYqOLi87F4eLBB-J2mTWhHKezwotASWsbOCMcM3Kw5fTA-MWRkKJyzFfsOmd3gzBsHCi7Uwo1rJltzmc3pFLnw4hbQ6JL4v7j-O01GSYeVKLvomGHbTNo1JSOD1mnb0dHEC0DjE07uIOwqrg5PRPw4upQIqy9vHvCV5mns0nkWzvSMgxYfoxZn5LrVeg8STpG5IOwn30Zw6MAziFs7s5Z-Zdfa0"
              alt="Sentinel portrait"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold">Sentinel 01</p>
            <p className="text-[9px] text-on-surface-variant">
              Protocol Level 4
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}