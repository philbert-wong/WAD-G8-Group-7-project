// The Help tour of each page (GuideTour.vue shows it): one list of steps per page address.
// Each step: a title, a short text, and which part of the page to light up (a CSS selector).
//   target: ''  = nothing to light up: the card shows in the middle of the screen
//   several selectors with commas = the first one that is visible on this screen is used,
//   e.g. the "☰ Filters" button on phones and the filter sidebar on computers
//   targetSmall (optional): used instead of target on phones (narrower than 768px), for a part that is too tall
//   to light up as a whole there
// The pages are not changed for the tour: it finds their parts by the ids and classes they already have.

export const TOUR_STEPS = {
  // Search page (also starts by itself on a first visit, after the presets popup)
  '/': [
    {
      title: 'Search anywhere',
      text: 'Type a town, street, block or postal code, e.g. Punggol or 560314.',
      target: '.search-box',
    },
    {
      title: 'Set your priorities and filters',
      text: 'Tick what matters to you (MRT, schools, food or parks) for the priority score on each flat, then pick a flat type, budget and lease.',
      target: '[aria-controls="filter-drawer"], #filter-drawer',
    },
    {
      title: 'Sort the results',
      text: 'Best fit for your priorities first, or cheapest first.',
      target: '#sort-by',
    },
    {
      title: 'Your priority score',
      text: 'How well this block fits what you ticked, out of 100.',
      target: '.bcard .match-score',
    },
    {
      title: 'Real prices, not asking prices',
      text: 'What flats here really sold for in the last 12 months. Tap Price details for the trend and every sale.',
      target: '.bcard',
    },
  ],

  // Map page
  '/map': [
    {
      title: 'Search anywhere',
      text: 'The same search as the Search page: a town, street, block, postal code or any place. The map shows those flats.',
      target: '.map-search',
    },
    {
      title: 'Click a dot',
      text: 'Each dot is a block. Click one to see its flat types, prices and lease.',
      target: '#mapBox',
    },
    {
      title: 'What the dots show',
      text: 'Show all flats or just your shortlist, and colour the dots by price or by priority score.',
      target: '.map-toolbar',
    },
    {
      title: 'Same priorities and filters as Search',
      text: 'Your Priorities and Filter Results are shared with Search: changing them here changes them on Search too.',
      target: '.map-choices',
    },
    {
      title: 'Living near your parents?',
      text: 'In Filters, type their postal code and switch on PHG to draw the 4 km Proximity Housing Grant circle.',
      target: '#filters-panel',
    },
  ],

  // Affordability page
  '/CPFCal': [
    {
      title: 'Tell us about your household',
      text: 'Who is buying, your income, CPF and cash, and the flat you want.',
      target: '.card:has(#cal-buyer-type)',
    },
    {
      title: 'Go step by step',
      text: 'Press Next to see the grants you may get, then the most you can afford.',
      target: '.card:has(#cal-buyer-type) .btn-primary',
    },
  ],

  // Compare page
  '/compare': [
    {
      title: 'Pick 2 or 3 flats',
      text: 'Tick flats from your shortlist. Save some on Search first if this is empty.',
      target: '.card:has(.form-check-input)',
    },
    {
      title: 'Side by side',
      text: 'Tick 2 flats above and they are compared here, price, lease, MRT and more. Prices in red are over your budget.',
      // Computers: the whole table. Phones (targetSmall): the table is stacked and taller than the screen, so only
      // its first card is lit up and the tour card sits under it. With fewer than 2 flats ticked there is no table:
      // the "Tick at least 2 flats" line is lit up instead (it and the table are never on the page together).
      target: 'table.table-bordered, .compare-hint',
      targetSmall: '.compare-table tbody tr:first-child, .compare-hint',
    },
  ],

  // Shortlist page
  '/shortlist': [
    {
      title: 'Your saved flats',
      text: 'The same card as on Search, with price details and nearby amenities.',
      target: '.bcard',
    },
    {
      title: 'Keep notes',
      text: 'Write what you thought of a flat and press Save.',
      target: '.note-card',
    },
    {
      title: 'Compare them',
      text: 'Put 2 or 3 saved flats side by side.',
      target: '.navx a[href$="/compare"]',
    },
  ],

  // Profile page
  '/profile': [
    {
      title: 'Your preferences',
      text: 'Your town, flat type, budget and priorities. Press Show to change them; they are saved to your account.',
      target: '.prefs-card',
    },
    {
      title: 'Security questions',
      text: 'Your answers to 3 questions. You need them to reset your password if you forget it. Press Show to change them.',
      target: '.security-card',
    },
  ],

  // Login page
  '/login': [
    {
      title: 'Why make an account?',
      text: 'Your shortlist, notes and presets are saved, so they follow you to other devices.',
      target: '',
    },
  ],
}

// "Create account" (/createaccount) is the same page as Login, so it gets the same tip
TOUR_STEPS['/createaccount'] = TOUR_STEPS['/login']

// Any other page: a short general tip
export const FALLBACK_STEPS = [
  {
    title: 'Need help?',
    text: 'Press this button on any page for a quick tour of that page.',
    target: '',
  },
]
