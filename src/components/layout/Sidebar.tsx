import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Mic2, 
  Settings, 
  LogOut,
  Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { blink } from '../../lib/blink';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
    { id: 'surveys', label: t('common.surveys'), icon: ClipboardList },
    { id: 'contacts', label: t('common.contacts'), icon: Users },
    { id: 'simulation', label: t('common.simulation'), icon: Mic2 },
    { id: 'settings', label: t('common.settings'), icon: Settings },
  ];

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Phone className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">Vocal Survey</span>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                currentPage === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <button
          onClick={() => blink.auth.logout()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </button>
      </div>
    </aside>
  );
}
