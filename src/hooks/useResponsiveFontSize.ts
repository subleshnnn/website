'use client'

import { useState, useEffect } from 'react'
import { FONT_SIZES } from '@/lib/constants'

export function useResponsiveFontSize() {
  const [fontSize, setFontSize] = useState<string>(FONT_SIZES.base)

  useEffect(() => {
    const updateFontSize = () => {
      // xl breakpoint is 1280px
      if (window.innerWidth < 1280) {
        setFontSize(FONT_SIZES.baseMobile)
      } else {
        setFontSize(FONT_SIZES.base)
      }
    }

    // Set initial value
    updateFontSize()

    // Listen for window resize
    window.addEventListener('resize', updateFontSize)

    return () => window.removeEventListener('resize', updateFontSize)
  }, [])

  return fontSize
}
