// Keeps the keyboard inside an open popup or drawer, so Tab never moves to the page hidden behind it.
// ⚠️ NOT IN COURSE: reading which element has the keyboard focus (document.activeElement) and moving it with
// .focus() is plain JavaScript DOM work (Week 1 DOM + events), but focus handling itself was not taught.
// Used by ProfileModal.vue (the welcome / preferences popup) and SearchView.vue (the phone filter drawer).

// Everything inside the box that can be reached with the Tab key (and is not hidden or disabled)
function focusableParts(box) {
  const all = box.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')
  const list = []
  for (const element of all) {
    if (!element.disabled && element.offsetParent !== null) {
      list.push(element)
    }
  }
  return list
}

// Call this on every keydown while the box is open. Tab on the last part goes back to the first one,
// and Shift+Tab on the first part goes to the last one, so the focus stays inside the box.
export function keepFocusInside(box, event) {
  if (event.key !== 'Tab' || box === null) {
    return
  }
  const parts = focusableParts(box)
  if (parts.length === 0) {
    event.preventDefault()
    return
  }
  const first = parts[0]
  const last = parts[parts.length - 1]
  const inside = box.contains(document.activeElement)
  if (event.shiftKey) {
    if (!inside || document.activeElement === first || document.activeElement === box) {
      event.preventDefault()
      last.focus()
    }
  } else if (!inside || document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
