import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { navigation } from '../nav'

function SidebarLink({ href, title }: { href: string; title: string }) {
  return (
    <NavLink
      to={href}
      end={href === '/'}
      className={({ isActive }) =>
        `block px-3 py-1.5 rounded text-sm transition-colors ${
          isActive
            ? 'bg-brand-600/20 text-brand-300 font-medium'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
        }`
      }
    >
      {title}
    </NavLink>
  )
}

function Sidebar() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            WL
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">Whitelabel App</div>
            <div className="text-xs text-gray-500 leading-tight">Developer Docs</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.href} href={item.href} title={item.title} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-gray-800 text-xs text-gray-600">
        v1.15 · Whitelabel App
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-gray-800 bg-gray-950 fixed top-0 left-0 h-full z-20">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-gray-950 border-r border-gray-800 z-40 transition-transform md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </aside>

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 backdrop-blur px-4 h-12 flex items-center gap-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-white">Whitelabel App Docs</span>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
