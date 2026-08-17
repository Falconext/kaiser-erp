import type { Transition, Variants } from 'framer-motion';

export const honeyEase: Transition['ease'] = [0.22, 1, 0.36, 1];

export const honeyViewport = { once: true, margin: '-80px' } as const;

export const honeyPage: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.35, ease: honeyEase, staggerChildren: 0.08, delayChildren: 0.03 },
  },
};

export const honeySection: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, ease: honeyEase },
  },
};

export const honeyStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

export const honeyCard: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: honeyEase },
  },
};

export const honeyPop: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 10 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: honeyEase },
  },
};

export const honeyHover = {
  y: -6,
  scale: 1.012,
  transition: { duration: 0.22, ease: honeyEase },
};

export const honeyTap = { scale: 0.985 };
