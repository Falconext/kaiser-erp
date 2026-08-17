import { useEffect, useRef, useState } from 'react'

export default function useOutsideClick(initial = false): [boolean, (v: boolean) => void, React.RefObject<HTMLDivElement | null>] {
  const [isOpen, setIsOpen] = useState<boolean>(initial)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return [isOpen, setIsOpen, ref] as const
}
