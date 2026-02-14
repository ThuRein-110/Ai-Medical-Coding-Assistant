import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import {
  LayoutDashboard,
  Upload,
  FileText,
  History,
  LogOut,
  Activity,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    name: 'Upload Cases',
    path: '/dashboard/upload',
    icon: <Upload className="w-5 h-5" />,
    roles: ['admin', 'coder'],
  },
  {
    name: 'Case List',
    path: '/dashboard/cases',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    name: 'Audit Trail',
    path: '/dashboard/audit',
    icon: <History className="w-5 h-5" />
  },
];

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">AI MedCoding</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
