'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface FontContextType {
  fontFamily: string
  toggleFont: () => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontFamily, setFontFamily] = useState('Monaco, Consolas, monospace')

  const toggleFont = () => {
    setFontFamily(prev => prev === 'Monaco, Consolas, monospace' ? 'Cerial, sans-serif' : 'Monaco, Consolas, monospace')
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFont()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <FontContext.Provider value={{ fontFamily, toggleFont }}>
      {children}
    </FontContext.Provider>
  )
}

export function useFont() {
  const context = useContext(FontContext)
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}
