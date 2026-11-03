// The Help tour of each page (GuideTour.vue shows it): one list of steps per page address.
// Each step: a title, a short text, and which part of the page to light up (a CSS selector).
//   target: ''  = nothing to light up: the card shows in the middle of the screen
//   several selectors with commas = the first one that is visible on this screen is used,
//   e.g. the "☰ Filters" button on phones and the filter sidebar on computers
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
      target: '.map-sidebar > .cosy-card:has(#colour-price)',
    },
    {
      title: 'Same filters as Search',
      text: 'Changing them here changes them on Search too.',
      target: '.map-sidebar > div:has(#filters-panel)',
    },
    {
      title: 'Living near your parents?',
      text: "Type their postal code to draw the 4 km Proximity Housing Grant circle.",
      target: '.map-sidebar > .cosy-card:has(> h5)',
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
      text: 'Prices in red are over your budget.',
      target: 'table.table-bordered',
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
      title: 'Your presets',
      text: 'Your town, your parents\' postal code and your starting filters. Saved to your account.',
      target: '.card',
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
