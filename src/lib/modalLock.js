let lockCount = 0

export function lockModalScroll() {
  lockCount += 1
  document.documentElement.classList.add('modal-open')
}

export function unlockModalScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.documentElement.classList.remove('modal-open')
}
