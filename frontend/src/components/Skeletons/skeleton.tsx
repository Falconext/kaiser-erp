import "./skeleton.css"

interface SkeletonProps{
    height?: string
    width?: string
}

export default function Skeleton({height = "100px", width = "100%"}: SkeletonProps){
    return(
        <div className="skeleton"style={{height, width}}>
            <div className="skeleton__animation" >
            </div>
        </div>
    )
}