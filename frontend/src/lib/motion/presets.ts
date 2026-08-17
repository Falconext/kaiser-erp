import type { TargetAndTransition, Variant, Variants } from 'framer-motion'
import { motionTransitions } from './transitions'

const hiddenBase: TargetAndTransition = { opacity: 0 }
const visibleBase: TargetAndTransition = { opacity: 1 }

export const fadeIn: Variants = {
  initial: { ...hiddenBase },
  animate: {
    ...visibleBase,
    transition: motionTransitions.normal,
  },
  exit: {
    ...hiddenBase,
    transition: motionTransitions.fast,
  },
}

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.normal,
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: motionTransitions.fast,
  },
}

export const slideLeft: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: {
    opacity: 1,
    x: 0,
    transition: motionTransitions.normal,
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: motionTransitions.fast,
  },
}

export const slideRight: Variants = {
  initial: { opacity: 0, x: -24 },
  animate: {
    opacity: 1,
    x: 0,
    transition: motionTransitions.normal,
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: motionTransitions.fast,
  },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: motionTransitions.normal,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: motionTransitions.fast,
  },
}

export const listStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

export const listItemFadeUp: Variant = {
  opacity: 1,
  y: 0,
  transition: motionTransitions.fast,
}

export const listItemHidden: Variant = {
  opacity: 0,
  y: 8,
  transition: motionTransitions.fast,
}

export const interactiveHover = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { y: 0, scale: 0.99 },
}

export const chipInteractive = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.97 },
}

export const accordionReveal: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: motionTransitions.fast,
      opacity: { duration: 0.18, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: motionTransitions.micro,
      opacity: motionTransitions.micro,
    },
  },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: motionTransitions.fast,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: motionTransitions.micro,
  },
}

export const navStagger: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.12,
    },
  },
}

export const navItemReveal: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: motionTransitions.fast,
  },
}
