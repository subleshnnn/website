'use client'

import LeftNavigation from './LeftNavigation'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LeftNavigation />
      <div className="ml-64">
        {children}
      </div>
    </>
  )
}
