/** 暫停背景分頁的 RAF，並把恢復時機交回 Stage。 */
export function createPageVisibility({ onHidden, onVisible, target = document }) {
  const handleVisibility = () => {
    if (target.hidden) onHidden()
    else onVisible()
  }

  target.addEventListener('visibilitychange', handleVisibility)

  return {
    isVisible: () => !target.hidden,
    dispose() {
      target.removeEventListener('visibilitychange', handleVisibility)
    },
  }
}
