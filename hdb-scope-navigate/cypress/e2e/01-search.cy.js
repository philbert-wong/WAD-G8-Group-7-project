/**
 * E2E-01 — Search a postal code and see results.
 * OWNER: Data pipeline & QA
 *
 * Run `npm run seed:sample` first so there is data to find.
 * Note the data-cy selectors — never select on a CSS class, because styling changes.
 */
describe("Search", () => {
  beforeEach(() => {
    cy.visit("/explore");
  });

  it("centres the map and shows blocks", () => {
    // Stub the geocode call so the test doesn't depend on OneMap being up
    // (and doesn't burn our rate limit on every CI run).
    cy.intercept("GET", "/api/geocode*", {
      body: { lat: 1.3620, lng: 103.8540, address: "406 ANG MO KIO AVE 10" },
    }).as("geocode");

    cy.get('[data-cy=search-input]').type("560406");
    cy.get('[data-cy=search-submit]').click();
    cy.wait("@geocode");

    cy.get('[data-cy=result-count]').should("not.contain", "0 blocks");
  });

  it("shows a helpful message for an address that does not exist", () => {
    cy.intercept("GET", "/api/geocode*", {
      statusCode: 404,
      body: { error: 'Couldn\'t find "zzzzzz"' },
    });

    cy.get('[data-cy=search-input]').type("zzzzzz");
    cy.get('[data-cy=search-submit]').click();
    cy.get('[data-cy=search-error]').should("be.visible");
  });
});

// TODO (Data pipeline & QA): E2E-02 … E2E-08. See §10.2 of the proposal.
