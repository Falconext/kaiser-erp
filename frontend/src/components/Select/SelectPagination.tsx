import { useState } from 'react'
import { CSSProperties } from 'styled-components'
import Svg from '../Svg'
import { Icons } from '../Svg/iconsPack'
import styles from './select.module.css'
import { motion } from 'framer-motion'
import useOutsideClick from '../../hooks/useOutsideClick'

interface IProps {
    options: IOption[]
    onClick: (value: number) => any
    isLabel?: boolean
    value?: string
    placeholder?: string
    menuLeft?: boolean
    optionSelect?: boolean
    name?: string
    setNameSelect?: any
    setLabel?: any
    withLabel?: boolean
    label?: string
}

interface IOption {
    id: number,
    value: number
}

const SelectPagination = ({
    options,
    isLabel,
    label,
    onClick,
    optionSelect,
    menuLeft
}: IProps) => {

    const [showOptions, setShowOptions] = useState(false);
    const [valueOptions, setValueOptions] = useState<number>(options[2].value);
    const [isOpen, setIsOpen, ref] = useOutsideClick(false);

    const menuLeftStyle: CSSProperties = {
        top: menuLeft ? "-5px" : "60px",
        width: menuLeft ? "auto" : "100%",
        display: "flex",
        alignItems: "center",
        left: menuLeft ? "60px" : "0",
        zIndex: menuLeft ? "1" : "999999",
        height: optionSelect ? "auto" : ""
    }

    const optionSelectStyle: CSSProperties = {
        width: optionSelect ? "53%" : "auto",
        top: optionSelect ? "4px" : "auto"
    }

    const optionSelectInputStyle: CSSProperties = {
        minWidth: optionSelect ? "50px" : "",
        border: "1px solid #E1E3EA",
        borderRadius: "10px",
        position: "relative",
        display: "flex",
        top: "-5px",
        padding: "6px"
    }

    const setValueOption = (item: IOption) => {
        setValueOptions(item.value);
        onClick(item.value);
        setShowOptions(false);
        setIsOpen(false)
    }

    return (
        <>
            <div ref={ref} style={optionSelectStyle} className={styles.wrapper__select}>
                {isLabel && <label>{label}</label>}
                <div style={optionSelectInputStyle} className={styles.input__select} onClick={() => setIsOpen(!isOpen)}>
                    {valueOptions && <span>{valueOptions}</span>}
                    <Svg icon={Icons.arrowSelect} onClick={() => setShowOptions(!showOptions)} />
                </div>

                {isOpen && (
                    <motion.div style={menuLeftStyle} className={styles.content__listOptions}>
                        {
                            options && options.length > 0 && options.map((item: IOption) => (
                                <li className={styles.options__selectTotal} key={item.id} onClick={() => {
                                    setValueOption(item)
                                }}>
                                    <p>{item.value}</p>
                                </li>
                            ))
                        }
                    </motion.div>
                )}
            </div>
        </>
    )
}

export default SelectPagination;