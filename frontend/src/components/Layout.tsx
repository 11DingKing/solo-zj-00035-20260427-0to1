"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types";
import { GlobalLoading, ToastContainer } from "@/components/UiProviders";

interface LayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  roles?: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    label: "仪表盘",
    href: "/dashboard",
    icon: "📊",
  },
  {
    label: "商品管理",
    href: "/products",
    icon: "📦",
  },
  {
    label: "分类管理",
    href: "/categories",
    icon: "🏷️",
  },
  {
    label: "供应商管理",
    href: "/suppliers",
    icon: "🏢",
    roles: [UserRole.PURCHASER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    label: "仓库管理",
    href: "/warehouses",
    icon: "🏭",
    roles: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
  },
  {
    label: "库存查询",
    href: "/inventory",
    icon: "📈",
  },
  {
    label: "库存流水",
    href: "/inventory/transactions",
    icon: "📋",
  },
  {
    label: "采购订单",
    href: "/purchase-orders",
    icon: "🛒",
    roles: [UserRole.PURCHASER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
  },
  {
    label: "销售订单",
    href: "/sales-orders",
    icon: "💰",
    roles: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.FINANCE],
  },
  {
    label: "库存调拨",
    href: "/transfer-orders",
    icon: "🔄",
    roles: [UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN],
  },
  {
    label: "应付账款",
    href: "/finance/payables",
    icon: "💳",
    roles: [UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    label: "应收账款",
    href: "/finance/receivables",
    icon: "💵",
    roles: [UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    label: "财务汇总",
    href: "/finance/summary",
    icon: "📈",
    roles: [UserRole.FINANCE, UserRole.ADMIN],
  },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, restoreFromLocalStorage } =
    useAuthStore();

  useEffect(() => {
    restoreFromLocalStorage();
    setIsHydrated(true);
  }, [restoreFromLocalStorage]);

  const getRoleLabel = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: "系统管理员",
      [UserRole.WAREHOUSE_MANAGER]: "仓库管理员",
      [UserRole.PURCHASER]: "采购员",
      [UserRole.FINANCE]: "财务",
    };
    return roleMap[role];
  };

  const hasAccess = (roles?: UserRole[]): boolean => {
    if (!roles || roles.length === 0) return true;
    if (!isHydrated) return true; // 未 hydration 时显示所有菜单
    if (!user) {
      return false;
    }
    if (user.role === UserRole.ADMIN) return true;
    return roles.includes(user.role);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const visibleMenuItems = menuItems.filter((item) => hasAccess(item.roles));

  if (!isHydrated) {
    return (
      <html lang="zh-CN">
        <body className="min-h-screen bg-gray-100">
          <GlobalLoading />
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-gray-500 text-lg">加载中...</div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <GlobalLoading />
      <ToastContainer />

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-white shadow-lg transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          } flex flex-col`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-center border-b border-gray-200">
            {sidebarOpen ? (
              <h1 className="text-xl font-bold text-blue-600">
                进销存管理系统
              </h1>
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-2">
              {visibleMenuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {sidebarOpen && (
                      <span className="ml-3 text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Toggle Button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sidebarOpen ? (
                <>
                  <span className="text-xl">◀</span>
                  <span className="ml-2 text-sm">收起侧边栏</span>
                </>
              ) : (
                <span className="text-xl">▶</span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                {visibleMenuItems.find(
                  (item) =>
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/"),
                )?.label || "首页"}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  {user?.name || "用户"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role ? getRoleLabel(user.role) : ""}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || "U"}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                退出登录
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
