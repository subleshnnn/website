interface CityDisplayProps {
  location: string
  className?: string
  style?: React.CSSProperties
}

export default function CityDisplay({
  location,
  className = '',
  style = {}
}: CityDisplayProps) {
  return (
    <div
      className={`flex items-center justify-center text-center ${className}`}
      style={{
        ...style,
        height: '300px',
        fontFamily: 'Cerial, sans-serif',
        fontSize: '4rem',
        lineHeight: '1',
        color: '#000'
      }}
    >
      {location}
    </div>
  )
}