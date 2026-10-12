// Used by .sort() to put numbers from small to big
function compareNumbers(a, b) {
  return a - b;
}

// The middle value of a list of numbers (average of the two middle ones when the count is even).
// Same idea as the median in prep/summariseResale.js.
function median(numbers) {
  // copy the list first, so sorting does not change the original
  const sorted = [];
  for (const number of numbers) {
    sorted.push(number);
  }
  sorted.sort(compareNumbers);

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    // odd count, e.g. 5 numbers: the 3rd one is the middle
    return sorted[middle];
  }
  // even count, e.g. 4 numbers: average of the 2nd and 3rd
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// Turns a block's sales into the "price details" the frontend shows:
// a summary (range, median, median price per m2) and each sale with its own price per m2.
export function salesSummary(sales) {
  if (sales.length === 0) {
    return {
      count: 0,
      lowest: null,
      highest: null,
      medianPrice: null,
      medianPricePerSqm: null,
      sales: [],
    };
  }

  const rows = [];
  const prices = [];
  const pricesPerSqm = [];
  let lowest = sales[0].price;
  let highest = sales[0].price;

  for (const sale of sales) {
    // price per square metre, rounded to the dollar: $600,000 / 90 m2 = $6,667
    const pricePerSqm = Math.round(sale.price / sale.areaSqm);

    rows.push({
      month: sale.month,
      storey: sale.storey,
      areaSqm: sale.areaSqm,
      price: sale.price,
      pricePerSqm: pricePerSqm,
    });
    prices.push(sale.price);
    pricesPerSqm.push(pricePerSqm);

    if (sale.price < lowest) {
      lowest = sale.price;
    }
    if (sale.price > highest) {
      highest = sale.price;
    }
  }

  return {
    count: rows.length,
    lowest: lowest,
    highest: highest,
    medianPrice: median(prices),
    medianPricePerSqm: median(pricesPerSqm),
    sales: rows,
  };
}
