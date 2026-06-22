/** Shared motion tokens — one easing curve for the whole app. */
export const PAGE_EASE = [0.32, 0.72, 0, 1] as const

export const PAGE_TRANSITION = {
  duration: 0.26,
  ease: PAGE_EASE,
} as const

export const STAGGER_CHILDREN = 0.04

export const listStaggerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_CHILDREN },
  },
}

export const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: PAGE_TRANSITION,
  },
}
