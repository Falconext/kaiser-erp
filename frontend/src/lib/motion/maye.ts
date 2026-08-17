import type { TargetAndTransition, Variants } from 'framer-motion'
import { motionTransitions } from './transitions'

export const mayeViewport = {
  once: true,
  amount: 0.18,
} as const

export const mayePage: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { ...motionTransitions.normal, staggerChildren: 0.08, delayChildren: 0.04 },
  },
  exit: { opacity: 0, transition: motionTransitions.fast },
}

export const mayeSection: Variants = {
  initial: { opacity: 0, y: 28, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: motionTransitions.section,
  },
}

export const mayeStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
}

export const mayeCard: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: motionTransitions.springSoft,
  },
}

export const mayeHeroText: Variants = {
  initial: { opacity: 0, x: -24, filter: 'blur(8px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: motionTransitions.section,
  },
}

export const mayeHeroMedia: Variants = {
  initial: { opacity: 0, scale: 1.04 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const mayeOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: motionTransitions.fast },
  exit: { opacity: 0, transition: motionTransitions.micro },
}

export const mayeSheet: Variants = {
  initial: { opacity: 0, x: '100%' },
  animate: { opacity: 1, x: 0, transition: motionTransitions.springSoft },
  exit: { opacity: 0, x: '100%', transition: motionTransitions.fast },
}

export const mayeModal: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: motionTransitions.springSoft },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: motionTransitions.fast },
}

export const mayeFloating: Variants = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: motionTransitions.springSoft },
  exit: { opacity: 0, y: 18, scale: 0.98, transition: motionTransitions.fast },
}

export const mayeHover: TargetAndTransition = {
  y: -6,
  scale: 1.015,
  transition: motionTransitions.springSoft,
}

export const mayeSubtleHover: TargetAndTransition = {
  y: -3,
  transition: motionTransitions.springSoft,
}

export const mayeTap: TargetAndTransition = {
  scale: 0.985,
  transition: motionTransitions.micro,
}
