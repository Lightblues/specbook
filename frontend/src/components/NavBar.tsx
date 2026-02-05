'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useState } from 'react';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/ideas?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold hover:opacity-80">
            <span className="text-2xl">📚</span>
            <span>Specbook</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/ideas"
              className={`hover:text-blue-500 transition-colors ${
                isActive('/ideas') ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Ideas
            </Link>
            <Link
              href="/projects"
              className={`hover:text-blue-500 transition-colors ${
                isActive('/projects') ? 'text-blue-500 font-medium' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Projects
            </Link>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors"
              >
                Dashboard
              </Link>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.id}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                  />
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
