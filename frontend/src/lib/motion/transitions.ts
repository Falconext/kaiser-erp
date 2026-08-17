import type { Transition } from 'framer-motion'

export const MOTION_EASE_STANDARD: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

export const motionDurations = {
  micro: 0.16,
  fast: 0.22,
  normal: 0.3,
  section: 0.48,
} as const

export const motionTransitions = {
  micro: {
    duration: motionDurations.micro,
    ease: MOTION_EASE_STANDARD,
  } satisfies Transition,
  fast: {
    duration: motionDurations.fast,
    ease: MOTION_EASE_STANDARD,
  } satisfies Transition,
  normal: {
    duration: motionDurations.normal,
    ease: MOTION_EASE_STANDARD,
  } satisfies Transition,
  section: {
    duration: motionDurations.section,
    ease: MOTION_EASE_STANDARD,
  } satisfies Transition,
  springSoft: {
    type: 'spring',
    stiffness: 280,
    damping: 24,
    mass: 0.9,
  } satisfies Transition,
} as const
