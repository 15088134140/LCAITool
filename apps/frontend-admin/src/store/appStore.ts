import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  currentPageTitle: string;
  breadcrumbs: { label: string; path?: string }[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPageTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: { label: string; path?: string }[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPageTitle: '仪表盘',
  breadcrumbs: [{ label: '首页' }],
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentPageTitle: (title) => set({ currentPageTitle: title }),
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}));
