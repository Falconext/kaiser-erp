

import { useState } from 'react';
import styles from './pagination.module.css';
import SelectPagination from '@/components/Select/SelectPagination';

interface IProps {
    total?: number
    pages?: [] | any
    data?: [] | any
    callback?: (num: number) => void
    page?: number
    indexOfFirstItem?: number | any
    indexOfLastItem?: number
    optionSelect?: boolean
    setPage?: (option: number) => void
    handleChangeOption?: any
    setcurrentPage?: any
    currentPage?: any
    setitemsPerPage?: any
}

const Pagination = ({ pages, currentPage, setitemsPerPage, indexOfFirstItem, indexOfLastItem, setcurrentPage, total, optionSelect }: IProps) => {

    const [options,] = useState([
        { id: 1, value: 10 },
        { id: 2, value: 25 },
        { id: 3, value: 50 }
    ]);

    const [pageNumberLimit,] = useState(10);
    const [maxPageNumberLimit, setMaxPageNumberLimit] = useState(10)
    const [minPageNumberLimit, setMinPageNumberLimit] = useState(0);

    const handleChangeOption = (postPorPage: number) => {
        setitemsPerPage(postPorPage)
    }

    const isActive = (index: number): any => {
        if (index === currentPage) return "active"
        return;
    }

    const handleNextbtn = () => {
        setcurrentPage(currentPage + 1)
        if (currentPage + 1 > maxPageNumberLimit) {
            setMaxPageNumberLimit(maxPageNumberLimit + pageNumberLimit);
            setMinPageNumberLimit(minPageNumberLimit + pageNumberLimit);
        }
    };

    const handlePrevbtn = () => {
        setcurrentPage(currentPage - 1)
        if ((currentPage - 1) % pageNumberLimit == 0) {
            setMaxPageNumberLimit(maxPageNumberLimit - pageNumberLimit);
            setMinPageNumberLimit(minPageNumberLimit - pageNumberLimit);
        }
    };

    const handleClick = (num: any) => {
        setcurrentPage(Number(num))
    }

    const handleChangeOptions = (value: number) => {
        if (handleChangeOption !== undefined) {
            handleChangeOption(value)
        }
        setcurrentPage(1);
        setMaxPageNumberLimit(10);
        setMinPageNumberLimit(0)
    }

    return (
        <nav className={styles.container__pagination}>

            <span className={styles.count__pagination}>Mostrando {indexOfFirstItem + 1} - {indexOfLastItem} de {total}</span>

            <ul>
                {
                    indexOfFirstItem > 1 &&
                    <li className="" onClick={handlePrevbtn}>
                        <span className="" >&laquo;</span>
                    </li>

                }

                {
                    minPageNumberLimit >= 1 &&
                    <li onClick={handlePrevbtn}> &hellip; </li>
                }


                {
                    pages?.map((num: any) => {
                        if (num < maxPageNumberLimit + 1 && num > minPageNumberLimit) {
                            return (
                                <li className={`${styles[isActive(num)]}`} key={num} onClick={() => handleClick(num)}>
                                    <span className="">{num}</span>
                                </li>
                            )
                        }
                    })
                }

                {
                    pages?.length > maxPageNumberLimit &&
                    <li onClick={handleNextbtn}> &hellip; </li>
                }

                {
                    currentPage !== pages[pages?.length - 1] &&
                    <li className="" onClick={handleNextbtn}>
                        <span className="">&raquo;</span>
                    </li>
                }

            </ul>

            {
                optionSelect && (
                    <div className={styles.registers}>
                        <p>Ver</p>
                        <SelectPagination menuLeft optionSelect options={options} onClick={handleChangeOptions} />
                        <p>registros</p>
                    </div>
                )
            }
        </nav>
    )
}

export default Pagination;