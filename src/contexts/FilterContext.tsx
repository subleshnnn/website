'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface FilterContextType {
  filters: {
    cities: string[]
    types: string[]
    maxBudget: number
    dateFrom: string
    dateTo: string
  }
  setFilters: (filters: { cities: string[]; types: string[]; maxBudget: number; dateFrom: string; dateTo: string }) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState({
    cities: [] as string[],
    types: [] as string[],
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
