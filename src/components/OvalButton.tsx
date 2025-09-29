import React from 'react'

interface OvalButtonProps {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function OvalButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  className = ''
}: OvalButtonProps) {
  const baseClasses = "relative px-6 py-3 text-lg transition-opacity disabled:opacity-50 overflow-hidden"
  const textClasses = variant === 'primary' ? 'text-white' : 'text-black'
  const svgColor = variant === 'primary' ? '#000000' : '#ffffff'
  const hoverSvgColor = variant === 'primary' ? '#374151' : '#f3f4f6'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${textClasses} ${className} group`}
      style={{ background: 'transparent' }}
    >
      {/* Background SVG - normal state */}
      <svg
        className="absolute inset-0 w-full h-full opacity-100 group-hover:opacity-0 transition-opacity"
        style={{ zIndex: -1 }}
        viewBox="0 0 262.2 87.5"
      >
        <path d="M260.5,44c0,5.9-3.4,11.4-10.3,16.6c-6.8,5.1-16.1,9.6-27.8,13.5c-11.7,3.9-25.4,6.9-41.1,9.1c-15.7,2.2-32.4,3.3-50.2,3.3c-18,0-34.9-1.1-50.6-3.3C64.9,81,51.2,78,39.6,74.1c-11.7-3.9-20.9-8.4-27.8-13.5C5,55.4,1.5,49.9,1.5,44c0-5.9,3.4-11.4,10.3-16.6c6.8-5.1,16.1-9.6,27.8-13.5C51.2,10,64.9,7,80.6,4.8c15.7-2.2,32.6-3.3,50.6-3.3c17.7,0,34.5,1.1,50.2,3.3c15.7,2.2,29.4,5.2,41.1,9.1c11.7,3.9,20.9,8.4,27.8,13.5C257.1,32.5,260.5,38.1,260.5,44z" fill={svgColor}/>
      </svg>

      {/* Background SVG - hover state */}
      <svg
        className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ zIndex: -1 }}
        viewBox="0 0 262.2 87.5"
      >
        <path d="M260.5,44c0,5.9-3.4,11.4-10.3,16.6c-6.8,5.1-16.1,9.6-27.8,13.5c-11.7,3.9-25.4,6.9-41.1,9.1c-15.7,2.2-32.4,3.3-50.2,3.3c-18,0-34.9-1.1-50.6-3.3C64.9,81,51.2,78,39.6,74.1c-11.7-3.9-20.9-8.4-27.8-13.5C5,55.4,1.5,49.9,1.5,44c0-5.9,3.4-11.4,10.3-16.6c6.8-5.1,16.1-9.6,27.8-13.5C51.2,10,64.9,7,80.6,4.8c15.7-2.2,32.6-3.3,50.6-3.3c17.7,0,34.5,1.1,50.2,3.3c15.7,2.2,29.4,5.2,41.1,9.1c11.7,3.9,20.9,8.4,27.8,13.5C257.1,32.5,260.5,38.1,260.5,44z" fill={hoverSvgColor}/>
      </svg>

      {/* Text content */}
      <span className="relative z-10">{children}</span>
    </button>
  )
}