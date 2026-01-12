/**
 * Smooth scroll helper that accounts for sticky header height
 */

const HEADER_HEIGHT = 80 // Adjust based on your navbar height

export function smoothScrollTo(elementId: string, offset: number = HEADER_HEIGHT) {
  const element = document.getElementById(elementId)
  if (!element) return

  const elementPosition = element.getBoundingClientRect().top
  const offsetPosition = elementPosition + window.pageYOffset - offset

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  })
}

export function scrollToHash(hash: string | null, offset: number = HEADER_HEIGHT) {
  if (!hash) return
  const elementId = hash.replace('#', '')
  smoothScrollTo(elementId, offset)
}

export function handleHashOnLoad(offset: number = HEADER_HEIGHT) {
  if (typeof window === 'undefined') return
  
  // Check if there's a hash in the URL
  const hash = window.location.hash
  if (hash) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      scrollToHash(hash, offset)
    }, 100)
  }
}

