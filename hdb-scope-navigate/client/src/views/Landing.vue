<script setup>
/** OWNER: Frontend — Shell & UI */
const features = [
  { icon: "Map", title: "Search blocks, not listings",
    text: "Every HDB block with resale sales, coloured by what flats there actually sold for. Filter the whole island by budget, lease and walk to the MRT at once.",
    to: "/explore", cta: "Open the map" },
  { icon: "Fit", title: "A score that follows your priorities",
    text: "Slide how much transport, food, greenery, healthcare and schools matter to you. Blocks are scored and ranked for you, live.",
    to: "/explore", cta: "Set my priorities" },
  { icon: "Walk", title: "Real walking routes",
    text: "Walking minutes to the MRT come from real paths, not a straight-line circle — so canals and expressways count.",
    to: "/explore", cta: "See a route" },
  { icon: "Pin", title: "Amenity layers",
    text: "Switch on schools, parks, hawker centres, clinics and eldercare services and see them around any block.",
    to: "/explore", cta: "Show amenities" },
  { icon: "↗", title: "Price trends & lease decay",
    text: "How fast prices are rising in each town and flat type, and what each remaining year of lease is worth per square metre.",
    to: "/trends", cta: "View trends" },
  { icon: "S$", title: "Affordability & grants",
    text: "Estimate your loan, downpayment and the CPF grants you could get — then use it as a budget filter on the map.",
    to: "/affordability", cta: "Calculate my budget" },
  { icon: "4km", title: "Proximity Housing Grant",
    text: "Enter a parent's address and see which blocks are within 4 km — where the live-near grant applies.",
    to: "/explore", cta: "Try it" },
  { icon: "★", title: "Shortlist & compare",
    text: "Save promising blocks with your own notes and compare up to four side by side.",
    to: "/shortlist", cta: "My shortlist" },
];
</script>

<template>
  <div>
    <section class="hero">
      <div class="container py-5" style="max-width: 860px">
        <h1 class="display-5 fw-bold mb-3">Find a flat you can afford, somewhere you can actually get to.</h1>
        <p class="lead text-muted mb-4">
          Deciding <em>where</em> to look comes before picking a listing. HDB resale prices, remaining lease and
          real walking times to the MRT, on one map.
        </p>
        <div class="d-flex flex-wrap gap-2">
          <RouterLink class="btn btn-primary btn-lg" to="/explore" data-cy="cta-explore">Open the map</RouterLink>
          <RouterLink class="btn btn-outline-primary btn-lg" to="/affordability">What can I afford?</RouterLink>
        </div>
      </div>
    </section>

    <section class="container py-5" style="max-width: 1100px">
      <h2 class="h4 mb-4">Everything you need to narrow down where to look</h2>
      <div class="row g-3">
        <div v-for="f in features" :key="f.title" class="col-sm-6 col-lg-3">
          <RouterLink :to="f.to" class="feature-card">
            <div class="feature-card__icon">{{ f.icon }}</div>
            <h3 class="h6">{{ f.title }}</h3>
            <p class="small text-muted mb-2">{{ f.text }}</p>
            <span class="small fw-semibold">{{ f.cta }} →</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="container pb-5" style="max-width: 1100px">
      <div class="row g-4">
        <div class="col-md-4"><div class="stat-card">
          <div class="stat-card__label">Step 1</div>
          <h3 class="h6 mt-1">Narrow down</h3>
          <p class="small text-muted mb-0">Set a budget, minimum lease and how far you'll walk to the MRT. The map updates as you drag.</p>
        </div></div>
        <div class="col-md-4"><div class="stat-card">
          <div class="stat-card__label">Step 2</div>
          <h3 class="h6 mt-1">Rank by what matters</h3>
          <p class="small text-muted mb-0">Weight the things you care about and let the score pick out the best blocks for you.</p>
        </div></div>
        <div class="col-md-4"><div class="stat-card">
          <div class="stat-card__label">Step 3</div>
          <h3 class="h6 mt-1">Then go to the listings</h3>
          <p class="small text-muted mb-0">Shortlist a few blocks, compare them, and only then turn to a listing portal to find flats for sale.</p>
        </div></div>
      </div>
      <hr class="my-5" />
      <p class="small text-muted mb-0">
        Prices are transacted resale prices published by HDB on data.gov.sg. They are not current asking
        prices, and nothing here is a valuation or financial advice. Trend and affordability figures are indicative only.
      </p>
    </section>
  </div>
</template>
