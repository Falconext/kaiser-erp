export default function ProductCardSkeleton() {
    return (
        <div className="flex flex-col h-full bg-white animate-pulse">
            {/* Image Skeleton */}
            <div className="relative w-full aspect-[3/4] bg-gray-200 rounded-2xl mb-4" />

            {/* Title and Price Skeleton */}
            <div className="flex flex-col flex-1 gap-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>

                {/* Categories Skeleton */}
                <div className="flex flex-wrap gap-2">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>

                {/* Button Skeleton */}
                <div className="mt-auto">
                    <div className="w-full h-10 bg-gray-200 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
