// ==========================================================================
// 🍞 toast.js - A simple & standalone, pure JS toast/popup library for JS
// Ben Coleman, 2021
// =========================================================================

const toastStyles = document.createElement('style')
toastStyles.innerHTML = `
.toastY {
  color: white;
  background-color: #444;
  position: fixed;
  z-index: 1500;
  padding: 1rem;
  box-shadow: 0.2rem 0.5rem 0.8rem rgba(0, 0, 0, 0.5);
  border-radius: 0.5rem;
  cursor: default;
}
.toastShownY {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.3s linear;
}
.toastHiddenY {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s 0.5s, opacity 0.3s linear;
}`
document.body.appendChild(toastStyles)

// Show a toast message
export function showToast(message, duration = 2000, pos = 'top-center') {
  const toast = document.createElement(`div`)
  toast.classList.add(`toastY`)
  toast.classList.add(`toastHiddenY`)
  toast.innerHTML = message
  toast.addEventListener('click', () => {
    toast.classList.add(`toastHiddenY`)
  })

  document.body.appendChild(toast)

  switch (pos) {
    case 'top-center':
      toast.style.top = '5rem'
      toast.style.left = '50%'
      toast.style.transform = 'translateX(-50%)'
      break
    case 'top-right':
      toast.style.top = '5rem'
      toast.style.right = '2rem'
      break
    case 'top-left':
      toast.style.top = '2rem'
      toast.style.left = '2rem'
      break
    case 'bottom-center':
      toast.style.bottom = '5rem'
      toast.style.left = '50%'
      toast.style.transform = 'translateX(-50%)'
      break
    case 'bottom-right':
      toast.style.bottom = '5rem'
      toast.style.right = '2rem'
      break
    case 'bottom-left':
      toast.style.bottom = '5rem'
      toast.style.left = '2rem'
      break
    default:
      toast.style.top = '5rem'
      toast.style.left = '50%'
      toast.style.transform = 'translateX(-50%)'
  }

  // Show the toast
  toast.classList.replace('toastHiddenY', 'toastShownY')
  // Set a timeout to hide the toast
  setTimeout(function () {
    toast.classList.replace('toastShownY', 'toastHiddenY')
    // Remove from the DOM *after* fading out
    setTimeout(function () {
      document.body.removeChild(toast)
    }, 1000)
  }, duration)
}
