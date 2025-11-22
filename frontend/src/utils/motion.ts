export const variants = {
  fadeInUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.18 },
  },
  hoverLift: {
    initial: { y: 0 },
    whileHover: { y: -4 },
    transition: { duration: 0.16 },
  },
}