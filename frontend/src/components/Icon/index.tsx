import Svg from "../Svg";

interface IProps { 
    icon: string 
    onClick?: any
}


const Icon = ({ icon,onClick } : IProps) => {
    return (
        <Svg onClick={onClick} icon={icon} />
    )
}

export default Icon;