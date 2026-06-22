export const PAGE_TRANSITION = {
  duration: 0.26,
  ease: [0.32, 0.72, 0, 1] as const,
}

export const LIST_STAGGER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

export const LIST_ITEM = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: PAGE_TRANSITION },
}
