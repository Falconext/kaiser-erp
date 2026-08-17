import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import './styles.css'
import styles from './skeleton.module.css'

const TableSkeleton = ({ arrayData }: any) => {

    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
            if (arrayData?.length > 0) {
                setIsLoading(false)
            } else {
                setIsLoading(false)
            }
        }, 3000);
    }, [arrayData])

    return (
        <>
            {
                isLoading ?

                    <section className="container">
                        <div className="">
                            <div className="movie--isloading">
                                <div className='search__loading'>
                                    <div></div>
                                </div>
                                <div className='header__table'>
                                    <div className="loading__header1">
                                        <div></div>
                                    </div>
                                    <div className="loading__header2">
                                        <div></div>
                                    </div>
                                    <div className="loading__header3">
                                        <div></div>
                                    </div>
                                    <div className="loading__header4">
                                        <div></div>
                                    </div>
                                    <div className="loading__header5">
                                        <div></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className='tr--table'>
                                    <div className="loading-image1">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image2">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image3">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image4">
                                        <div className="loading__tbody"></div>
                                    </div>
                                    <div className="loading-image5">
                                        <div className="loading__tbody"></div>
                                    </div>
                                </div>
                                <div className="loading-content">
                                    <div className="loading-text-container">
                                        <div className="loading-main-text"></div>
                                    </div>
                                    <div className="loading-btn">
                                        <div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section> :
                    <div className={styles.not__data}>
                        <div className="flex flex-col items-center justify-center p-8">
                            <Icon icon="solar:box-search-linear" className="text-gray-300 dark:text-slate-600 text-7xl mb-4" />
                            <div>
                                <p className='font-medium text-gray-500 dark:text-gray-400 text-center text-sm'>No se encontraron resultados para tu búsqueda.</p>
                            </div>
                        </div>

                    </div>
            }
        </>
    )
}

export default TableSkeleton;