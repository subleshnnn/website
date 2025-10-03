'use client'

import { usePathname } from 'next/navigation'
import LeftNavigation from '@/components/LeftNavigation'
import { FilterProvider } from '@/contexts/FilterContext'
import { ViewModeProvider } from '@/contexts/ViewModeContext'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAltRoute = pathname?.startsWith('/alt')

  if (isAltRoute) {
    return <>{children}</>
  }

  return (
    <FilterProvider>
      <ViewModeProvider>
        <LeftNavigation />
        <div className="ml-64">
          {children}
        </div>
      </ViewModeProvider>
    </FilterProvider>
  )
}
