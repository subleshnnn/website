export default function ListingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Location */}
      <div className="h-6 bg-gray-200 rounded w-32 mx-auto"></div>

      {/* Date range */}
      <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>

      {/* Price */}
      <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-4"></div>

      {/* Image placeholder */}
      <div className="bg-gray-200 w-full rounded" style={{ height: '300px' }}></div>
    </div>
  )
}