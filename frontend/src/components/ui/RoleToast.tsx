import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useSessionStore } from '../../store/session'
import { PAGE_TRANSITION } from '../../lib/motion'

export function RoleToast() {
  const roleToast = useSessionStore((s) => s.roleToast)
  const hideRoleToast = useSessionStore((s) => s.hideRoleToast)

  useEffect(() => {
    if (!roleToast.visible) return
    const t = window.setTimeout(hideRoleToast, 3200)
    return () => window.clearTimeout(t)
  }, [roleToast.visible, hideRoleToast])

  return (
    <AnimatePresence>
      {roleToast.visible && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={PAGE_TRANSITION}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] px-4 py-2.5 bg-ink text-bone text-sm font-medium rounded-frame shadow-lift text-center"
          role="status"
        >
          {roleToast.message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
