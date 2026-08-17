
import { useState } from 'react';
import SelectPagination from '../Select/SelectPagination';
import styles from './pagination.module.css';

interface IProps {
    total: number
    callback: (num: number) => void
    page: number
    optionSelect?: boolean
    setPage: (option: number) => void
    handleChangeOption?: (num: number) => void
}

const PaginationTickets = ({ total, callback, page, setPage, optionSelect, handleChangeOption }: IProps) => {

    const newArr = [...Array(total)]?.map((_, i) => i + 1);
    const [options, ] = useState([
        { id: 1, value: 50 },
        { id: 2, value: 75 },
        { id: 3, value: 100 }
    ]);

    const [pageNumberLimit, ] = useState(5);
    const [maxPageNumberLimit, setMaxPageNumberLimit] = useState(5)
    const [minPageNumberLimit, setMinPageNumberLimit] = useState(0)

    const isActive = (index: number): any => {
        if (index === page) return "active"
        return;
    }

    const handlePagination = (num: number) => {
        callback(num);
    }

    const handleChangeOptions = (value: number) => {
        if (handleChangeOption !== undefined) {
            handleChangeOption(value)
        }
        setPage(1);
    }

    const handleNextbtn = () => {
        setPage(page + 1);

        if (page + 1 > maxPageNumberLimit) {
            setMaxPageNumberLimit(maxPageNumberLimit + pageNumberLimit);
            setMinPageNumberLimit(minPageNumberLimit + pageNumberLimit);
        }
    };

    const handlePrevbtn = () => {
        setPage(page - 1);

        if ((page - 1) % pageNumberLimit == 0) {
            setMaxPageNumberLimit(maxPageNumberLimit - pageNumberLimit);
            setMinPageNumberLimit(minPageNumberLimit - pageNumberLimit);
        }
    };
    return (
        <nav className={styles.container__pagination}>

        {
            optionSelect && (
                <div className={styles.registers}>
                    <p>Ver</p>
                    <SelectPagination menuLeft optionSelect options={options} onClick={handleChangeOptions} />
                    <p>registros</p>
                </div>
            )
        }

        <ul>
            {
                page > 1 &&
                <li className="" onClick={handlePrevbtn}>
                    <span className="" >&laquo;</span>
                </li>
            }

            {
                minPageNumberLimit >= 1 &&
                <li onClick={handlePrevbtn}> &hellip; </li>
            }


            {
                newArr.map((num) => {
                    if (num < maxPageNumberLimit + 1 && num > minPageNumberLimit) {
                        return (
                            <li className={`${styles[isActive(num)]}`} key={num} onClick={() => handlePagination(num)}>
                                <span className="">{num}</span>
                            </li>
                        )
                    }
                })
            }

            {
                newArr.length > maxPageNumberLimit &&
                <li onClick={handleNextbtn}> &hellip; </li>
            }

            {
                page < total &&
                <li className="" onClick={handleNextbtn}>
                    <span className="">&raquo;</span>
                </li>
            }

        </ul>
    </nav>
    )
}

export default PaginationTickets;