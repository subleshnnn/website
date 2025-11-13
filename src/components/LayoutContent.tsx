'use client'

import { usePathname } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import { FilterProvider } from '@/contexts/FilterContext'
import { ViewModeProvider } from '@/contexts/ViewModeContext'

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAltRoute = pathname?.startsWith('/alt')
  const isTextEditorRoute = pathname?.startsWith('/text-editor-test')

  if (isAltRoute || isTextEditorRoute) {
    return <>{children}</>
  }

  return (
    <FilterProvider>
      <ViewModeProvider>
        {/* Universal Navigation - shows on all screen sizes */}
        <MobileNavigation />

        {children}
      </ViewModeProvider>
    </FilterProvider>
  )
}
