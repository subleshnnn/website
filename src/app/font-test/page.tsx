'use client'

import { useState } from 'react'
import { FONT_FAMILY } from '@/lib/constants'

export default function FontTestPage() {
  const testText = "The quick brown fox jumps over the lazy dog"
  const strokeWidths = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
  const [textColor, setTextColor] = useState('#000000')

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl mb-8 text-black" style={{ fontFamily: FONT_FAMILY }}>
        Cerial Font Stroke Weight Test
      </h1>

      <div className="mb-8 flex items-center gap-4">
        <label className="text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          Text Color:
        </label>
        <input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="w-20 h-10 cursor-pointer"
        />
        <button
          onClick={() => setTextColor('#000000')}
          className="px-4 py-2 border border-black text-black"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          Reset to Black
        </button>
      </div>

      <div className="space-y-8">
        {strokeWidths.map((strokeWidth) => (
          <div key={strokeWidth} className="border-b border-gray-200 pb-6">
            <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
              Stroke width: {strokeWidth}px
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: '32px',
                color: textColor,
                WebkitTextStroke: `${strokeWidth}px black`,
                paintOrder: 'stroke fill'
              }}
            >
              {testText}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl mb-4 text-black" style={{ fontFamily: FONT_FAMILY }}>
          Different Font Sizes with Stroke
        </h2>
        {[16, 24, 32, 48, 64].map((fontSize) => (
          <div key={fontSize} className="mb-6">
            <div className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
              {fontSize}px with 1px stroke
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: `${fontSize}px`,
                color: textColor,
                WebkitTextStroke: '1px black',
                paintOrder: 'stroke fill'
              }}
            >
              {testText}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
