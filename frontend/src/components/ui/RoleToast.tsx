import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSessionStore } from '../../store/session'

import { PAGE_TRANSITION } from '../../lib/motion'

export function RoleToast() {
  const { roleToast, hideRoleToast } = useSessionStore()

  useEffect(() => {
    if (!roleToast.visible) return
    const timer = window.setTimeout(hideRoleToast, 3200)
    return () => window.clearTimeout(timer)
  }, [roleToast.visible, hideRoleToast])

  return (
    <AnimatePresence>
      {roleToast.visible && (
        <motion.div
          key={roleToast.message}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={PAGE_TRANSITION}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] px-4 py-2.5 bg-ink text-bone text-sm font-medium rounded-pill shadow-frame text-center"
          role="status"
          aria-live="polite"
        >
          {roleToast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
