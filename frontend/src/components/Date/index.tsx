import React, { JSX, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './date.module.css';
import { Icons } from '../Svg/iconsPack';
import Icon from '../Icon';
import useOutsideClick from '../../hooks/useOutsideClick';
import moment from 'moment';
import { motion } from 'framer-motion';
import InputPro from '../InputPro';
import { useThemeStore } from '../../zustand/theme';

export interface CalendarEvent {
    date: Date;
    description: string;
    mode?: string;
}

const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/;

interface CalendarProps {
    mode?: string;
    events?: CalendarEvent[];
    text?: string;
    onChange: (date: string, name: string) => void;
    name?: string;
    right?: boolean;
    left?: boolean;
    disabled?: boolean;
    top?: boolean;
    withOutFormat?: boolean;
    value?: string;
    className?: string;
    isLabel?: boolean;
    portal?: boolean;
}

export const Calendar = ({ mode, events, text, onChange, name, right, left, disabled, top, withOutFormat, value = '', className = '', portal = false }: CalendarProps) => {
    const { isDarkMode } = useThemeStore();
    const [writeDate, setWriteDate] = useState<string>(value || '');
    const userChangedDate = useRef(false);
    const onChangeRef = useRef(onChange);
    const [selectedDate, setSelectedDate] = useState(() => {
        if (value) {
            const parsed = moment(value, 'DD/MM/YYYY');
            return parsed.isValid() ? parsed.toDate() : new Date();
        }
        return new Date();
    });
    const [calendarDate, setCalendarDate] = useState(() => {
        if (value) {
            const parsed = moment(value, 'DD/MM/YYYY');
            return parsed.isValid() ? parsed.toDate() : new Date();
        }
        return new Date();
    });
    const [isOpen, setIsOpen, ref] = useOutsideClick(false);
    const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });

    const updatePortalPosition = () => {
        if (!ref.current || typeof window === 'undefined') return;
        const rect = ref.current.getBoundingClientRect();
        const panelWidth = 300;
        const panelHeight = 390;
        const gap = 8;
        const leftPos = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
        const fitsBelow = rect.bottom + panelHeight + gap <= window.innerHeight;
        setPortalPosition({
            left: leftPos,
            top: fitsBelow ? rect.bottom + gap : Math.max(12, rect.top - panelHeight - gap),
        });
    };

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Efecto para actualizar cuando cambia el prop value
    useEffect(() => {
        if (!value) {
            setWriteDate('');
            return;
        }

        if (value !== writeDate) {
            setWriteDate(value);
            const parsed = moment(value, 'DD/MM/YYYY');
            if (parsed.isValid()) {
                setSelectedDate(parsed.toDate());
                setCalendarDate(parsed.toDate());
            }
        }
    }, [value]);

    useEffect(() => {
        if (selectedDate) {
            setCalendarDate(new Date(selectedDate));
        }
    }, [selectedDate]);

    useEffect(() => {
        if (!isOpen || !portal) return;
        updatePortalPosition();
        window.addEventListener('resize', updatePortalPosition);
        window.addEventListener('scroll', updatePortalPosition, true);
        return () => {
            window.removeEventListener('resize', updatePortalPosition);
            window.removeEventListener('scroll', updatePortalPosition, true);
        };
    }, [isOpen, portal]);

    const daysInMonth = (date: Date): number => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date): number => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (date: Date): void => {
        userChangedDate.current = true;
        setWriteDate(moment(date).format('DD/MM/YYYY'));
        setSelectedDate(date);
        setIsOpen(false);
    };

    const handleChangeDate = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const input = e.target.value;
        if (!input) {
            userChangedDate.current = true;
            setWriteDate('');
            onChange('', name ?? '');
            return;
        }

        if (input.length > 10 || input.replace(dateRegex, '').length > 0) return;
        const match = input.match(dateRegex);
        if (match) {
            const [, day, month, year] = match;
            if (parseInt(day) > 31 || parseInt(month) > 12) return;
            const formatted = `${day}/${month}/${year}`;
            userChangedDate.current = true;
            setWriteDate(formatted);
        }
    };

    const getEventDescription = (date: Date): string | null => {
        const event = events?.find((e) => e.date.toDateString() === date.toDateString());
        return event ? event.description : null;
    };

    const renderDays = (): JSX.Element[] => {
        const days: JSX.Element[] = [];
        for (let i = 0; i < firstDayOfMonth(calendarDate); i++) {
            days.push(<div key={`empty-${i}`} className={styles.empty}></div>);
        }

        for (let i = 1; i <= daysInMonth(calendarDate); i++) {
            const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i);
            const eventDescription = getEventDescription(date);
            const classNames = [styles.day];
            if (date.toDateString() === new Date().toDateString()) classNames.push(styles.today);
            if (date.toDateString() === selectedDate.toDateString()) classNames.push(styles.selected);
            if (eventDescription) classNames.push(styles['has-event']);

            days.push(
                <div key={`day-${i}`} className={classNames.join(' ')} onClick={() => handleDateClick(date)} title={eventDescription || ''}>
                    {i}
                </div>
            );
        }
        return days;
    };

    useEffect(() => {
        if (writeDate && writeDate.length === 10) {
            const parsed = moment(writeDate, 'DD/MM/YYYY').toDate();
            setSelectedDate(parsed);
        }
    }, [writeDate]);

    useEffect(() => {
        if (selectedDate && userChangedDate.current && writeDate.length === 10) {
            const formatted = withOutFormat ? moment(selectedDate).format('YYYY-MM-DD') : moment(selectedDate).format('DD/MM/YYYY');
            onChangeRef.current(formatted, name ?? '');
        }
    }, [selectedDate, writeDate, withOutFormat, name]);

    const calendarPanel = (
        <motion.div
            className={styles.panel}
            animate={portal ? { opacity: 1, x: 0, y: 0 } : left ? { x: -140, y: 10 } : top ? { x: 0, y: -400 } : right ? { y: 40 } : { x: 0, y: 10 }}
            initial={portal ? { opacity: 0, y: -4 } : left ? { y: 10, x: -10 } : top ? { x: 0, y: -390 } : right ? { y: 20 } : { y: 40 }}
            style={{
                ...(portal ? { position: 'fixed', top: portalPosition.top, left: portalPosition.left, zIndex: 2147483000 } : {}),
                ...(isDarkMode ? { background: '#1e2435', border: '1px solid #2d3748', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' } : {}),
            }}
        >
            <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className={isDarkMode ? styles.dark : ''}
            >
                <div className={styles.header}>
                    <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}>
                        <Icon icon={Icons.arrowLeft} />
                    </button>
                    <div className={styles.month}>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}>
                        <Icon icon={Icons.arrowRight} />
                    </button>
                </div>
                <div className={styles.days}>
                    {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map((day) => (
                        <div key={day} className={styles['day-label']}>{day}</div>
                    ))}
                    {renderDays()}
                </div>
            </div>
        </motion.div>
    );

    return (
        <div ref={ref} className={`${styles.date}${!text ? ` ${styles.noLabel}` : ''} ${className}`}>
            <div className={disabled ? styles.disabled : undefined}>
                <div className={mode === 'flex' ? styles.modeFlex : ''}>
                    <div className={`absolute z-[1] ${text ? 'top-[0px]' : 'top-[-2px]'} right-2`} onClick={() => { updatePortalPosition(); setIsOpen(!isOpen); }}>
                        <Icon icon={Icons.date} />
                    </div>
                </div>
                <InputPro
                    mode={mode}
                    disabled={disabled}
                    name={name ?? ''}
                    onClick={() => { updatePortalPosition(); setIsOpen(true); }}
                    isLabel={!!text}
                    label={text}
                    type="text"
                    onChange={handleChangeDate}
                    value={writeDate}
                />
            </div>
            {isOpen && (portal ? createPortal(calendarPanel, document.body) : calendarPanel)}
        </div>
    );
};
