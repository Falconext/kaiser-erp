import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useReducedMotionPreference(): boolean {
  const prefersReducedMotion = useReducedMotion()
  return useMemo(() => Boolean(prefersReducedMotion), [prefersReducedMotion])
}
