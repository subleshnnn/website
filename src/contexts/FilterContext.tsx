'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FilterContextType {
  filters: {
    city: string
    type: string
    maxBudget: number
    dateFrom: string
    dateTo: string
  }
  setFilters: (filters: { city: string; type: string; maxBudget: number; dateFrom: string; dateTo: string }) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState({
    city: 'All Cities',
    type: 'All Types',
    maxBudget: 0, // 0 means no budget filter
    dateFrom: '',
    dateTo: ''
  })

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}
