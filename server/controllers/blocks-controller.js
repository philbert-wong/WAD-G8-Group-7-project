// The /api/blocks controller: search, town names, nearby blocks, and one block's details.
// routes/blocks-routes.js decides which address runs which function below.
const blockModel = require('../models/block-model');
const amenityModel = require('../models/amenity-model');
const priceModel = require('../data/priceModel.json');

// The parts of the models this file uses
const Block = blockModel.Block;
const toCard = blockModel.toCard;
const earliestCommenceYear = blockModel.earliestCommenceYear;
const Amenity = amenityModel.Amenity;
const findNearestAmenities = amenityModel.findNearestAmenities;

// OneMap login from config.env (free account at onemap.gov.sg). Needed for place search and walking routes.
let oneMapEmail = '';
if (process.env.ONEMAP_EMAIL) {
  oneMapEmail = process.env.ONEMAP_EMAIL;
}
let oneMapPassword = '';
if (process.env.ONEMAP_PASSWORD) {
  oneMapPassword = process.env.ONEMAP_PASSWORD;
}

// =====================================================================
// Helpers (only used in this file)
// =====================================================================

// ---------- Error answer ----------

// Used in the catch block of every route: sends the right error answer to the frontend.
function sendError(res, error) {
  // MongoDB could not understand an id, e.g. /api/blocks/abc
  if (error.name === 'CastError') {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  // Mongoose rejected the data, e.g. a note longer than 500 letters
  if (error.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  // Anything else is a bug or a database problem: log it for us, keep the message simple for the user
  console.error(error);
  res.status(500).json({ message: 'Something went wrong' });
}

// ---------- Number checks ----------
// Helpers for numbers that arrive in the URL, e.g. ?maxPrice=600000
// (everything in a URL arrives as text at first)

// True when the value was not sent at all, or sent empty (?maxPrice=)
function isBlank(value) {
  if (value === undefined || value === '') {
    return true;
  }
  return false;
}

// True when the text is a real number: "600000" yes, "abc" no
function isNumber(value) {
  return Number.isFinite(Number(value));
}

// ---------- Search filter ----------

// Characters that have a special meaning in a MongoDB text pattern ($regex)
const SPECIAL_CHARACTERS = '.*+?^${}()|[]\\';

// Puts a \ in front of special characters, so "a.b" is searched as plain text, not as a pattern
function escapeSearchText(text) {
  let safeText = '';
  for (const character of text) {
    if (SPECIAL_CHARACTERS.includes(character)) {
      safeText = safeText + '\\' + character;
    } else {
      safeText = safeText + character;
    }
  }
  return safeText;
}

// ---------- Address text ----------
// Helpers so a typed address like "Blk 314 Ang Mo Kio Avenue 3" finds our block "314", "ANG MO KIO AVE 3"

// HDB writes street names short ("ANG MO KIO AVE 3", "BT BATOK ST 21"), but people often type the full words.
// Each pair is [the full word, HDB's short form] (only short forms that appear in our data).
const STREET_SHORT_FORMS = [
  ['AVENUE', 'AVE'], ['STREET', 'ST'], ['ROAD', 'RD'], ['DRIVE', 'DR'], ['CRESCENT', 'CRES'],
  ['BUKIT', 'BT'], ['NORTH', 'NTH'], ['SOUTH', 'STH'], ['UPPER', 'UPP'], ['JALAN', 'JLN'],
  ['LORONG', 'LOR'], ['CENTRAL', 'CTRL'], ['PARK', 'PK'], ['GARDENS', 'GDNS'], ['CLOSE', 'CL'],
  ['PLACE', 'PL'], ['TERRACE', 'TER'], ['TANJONG', 'TG'], ['HEIGHTS', 'HTS'], ['COMMONWEALTH', "C'WEALTH"],
];

// Our cards show addresses as "Blk 314 ANG MO KIO AVE 3", but the data and OneMap have no "Blk",
// so a leading "Blk" / "Block" is removed: "Blk 314 Ang Mo Kio Ave 3" -> "314 Ang Mo Kio Ave 3"
function removeBlkWord(text) {
  const upperText = text.toUpperCase();
  if (upperText.startsWith('BLK ')) {
    return text.slice(4).trim();
  }
  if (upperText.startsWith('BLOCK ')) {
    return text.slice(6).trim();
  }
  return text;
}

// True when the text starts with a digit, like a block number ("314", "260A") or a postal code
function startsWithDigit(text) {
  const firstLetter = text.charAt(0);
  return firstLetter >= '0' && firstLetter <= '9';
}

// The words of a text in capitals, ignoring extra spaces and commas: "northshore dr, punggol" -> ['NORTHSHORE', 'DR', 'PUNGGOL']
function toWords(text) {
  const words = [];
  const withoutCommas = text.toUpperCase().replaceAll(',', ' ');
  for (const word of withoutCommas.split(' ')) {
    if (word !== '') {
      words.push(word);
    }
  }
  return words;
}

// Puts words back together with one space between them: ['ANG', 'MO', 'KIO'] -> "ANG MO KIO"
function joinWords(words) {
  let text = '';
  for (const word of words) {
    if (text === '') {
      text = word;
    } else {
      text = text + ' ' + word;
    }
  }
  return text;
}

// Swaps full street words for HDB's short forms: ['ANG', 'MO', 'KIO', 'AVENUE', '3'] -> [..., 'AVE', '3']
function shortenStreetWords(words) {
  const shortWords = [];
  for (const word of words) {
    let shortWord = word;
    for (const pair of STREET_SHORT_FORMS) {
      if (word === pair[0]) {
        shortWord = pair[1];
      }
    }
    shortWords.push(shortWord);
  }
  return shortWords;
}

// Turns the query string (?q=punggol&maxPrice=600000...) into a MongoDB filter object.
// The route has already checked that the number filters really are numbers.
//
//   q          search text, matches block number, street or town, or a full address ("Blk 314 Ang Mo Kio Ave 3")
//   flatType   e.g. "4 ROOM"
//   maxPrice   budget in dollars
//   minLease   minimum remaining lease in years
function buildFilter(query) {
  const filter = {};

  if (query.q) {
    const typed = removeBlkWord(String(query.q).trim());
    const text = escapeSearchText(typed);
    const words = toWords(typed);
    // The same text with HDB's short street words: "Ang Mo Kio Avenue 3" -> "ANG MO KIO AVE 3"
    const shortText = escapeSearchText(joinWords(shortenStreetWords(words)));

    // $or = any one of these is enough. $options: 'i' = ignore upper/lower case
    filter.$or = [
      { block: { $regex: text, $options: 'i' } },
      { street: { $regex: text, $options: 'i' } },
      { town: { $regex: text, $options: 'i' } },
      { street: { $regex: shortText, $options: 'i' } },
    ];

    // A full address: the first word is a block number and the rest is its street.
    // Both must fit: the block number exactly (^...$ = the whole block number, so "314" is not "3140")
    // and the street. Then "314 Ang Mo Kio Ave 3" finds just that block's flats.
    if (words.length >= 2 && startsWithDigit(words[0])) {
      const blockText = '^' + escapeSearchText(words[0]) + '$';
      const streetText = escapeSearchText(joinWords(shortenStreetWords(words.slice(1))));
      filter.$or.push({
        block: { $regex: blockText, $options: 'i' },
        street: { $regex: streetText, $options: 'i' },
      });

      // The town may be typed at the end, like on our cards: "405B Northshore Dr Punggol".
      // Town names are 1 to 3 words ("ANG MO KIO"), so also try the last 1, 2 or 3 words as the town
      // and the words before them as the street (at least one street word must be left).
      for (let townWordCount = 1; townWordCount <= 3; townWordCount++) {
        const streetWordCount = words.length - 1 - townWordCount;
        if (streetWordCount >= 1) {
          const streetPart = words.slice(1, 1 + streetWordCount);
          const townPart = words.slice(1 + streetWordCount);
          filter.$or.push({
            block: { $regex: blockText, $options: 'i' },
            street: { $regex: escapeSearchText(joinWords(shortenStreetWords(streetPart))), $options: 'i' },
            town: { $regex: escapeSearchText(joinWords(townPart)), $options: 'i' },
          });
        }
      }
    }
  }

  if (query.flatType) {
    filter.flatType = String(query.flatType);
  }

  if (!isBlank(query.maxPrice)) {
    filter.price = { $lte: Number(query.maxPrice) }; // $lte = less than or equal
  }

  if (!isBlank(query.minLease)) {
    // $gte = greater than or equal
    filter.leaseCommenceYear = { $gte: earliestCommenceYear(Number(query.minLease)) };
  }

  return filter;
}

// ---------- Sales summary ----------

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
function salesSummary(sales) {
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

// ---------- Price estimate ----------
// Uses the weights trained in prep/priceRegression.ipynb (saved in data/priceModel.json)
// "04 TO 06" -> one number
function storeyToNumber(storeyRange) {
  const parts = storeyRange.split(" TO ") 
  const low = Number(parts[0]);
  const high = Number(parts[1]);
  return (low + high)/2;
}

// Months from priceModel.startMonth ("2021-01") up to this month
function monthsSinceStart() {
  const startYear = Number(priceModel.startMonth.slice(0, 4));   // 2021
  const startMonth = Number(priceModel.startMonth.slice(5, 7));  // 1
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;    // getMonth() is 0-11, so it needs + 1
  // the same formula as in prep/priceRegression.ipynb
  return (thisYear-startYear)*12 + (thisMonth-startMonth);
}

// features: { town, flatType, storey, leaseYears, areaSqm, months }
// Returns the estimated price in dollars
function estimatePrice(features) {
  const intercept = priceModel.intercept;
  const town = priceModel.town[features.town];
  const flatType = priceModel.flatType[features.flatType];
  const storeyWeight = priceModel.weights.storey;
  const leaseWeight  = priceModel.weights.lease_years;
  const monthsWeight = priceModel.weights.months_since_start;
  const areaWeight   = priceModel.weights.log_area;
  
  const logPrice = intercept 
    + storeyWeight * features.storey 
    + leaseWeight  * features.leaseYears
    + monthsWeight * features.months
    + areaWeight   * Math.log(features.areaSqm)
    + town
    + flatType;

  return Math.exp(logPrice);
}




// ---------- OneMap token ----------
// Gets (and remembers) a OneMap token. It lasts about 3 days, so we ask again a bit early.

let token = null;
let expiresAt = 0; // a time in milliseconds, like Date.now()
const walkCache = {};

async function getOneMapToken() {
  if (token !== null && Date.now() < expiresAt) {
    return token;
  }

  const response = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: oneMapEmail, password: oneMapPassword }),
  });
  if (!response.ok) {
    throw new Error('OneMap login failed (' + response.status + ')');
  }

  const data = await response.json();
  token = data.access_token;

  // Convert expiry_timestamp from seconds to milliseconds, then subtract 1 hour (3,600,000 ms)
  const safetyMarginMs = 60 * 60 * 1000; // 1 hour
  expiresAt = (data.expiry_timestamp * 1000) - safetyMarginMs;

  return token;
}

// ---------- Sorting ----------

// Used by .sort() to put the cheapest block first
function compareByPrice(a, b) {
  return a.price - b.price;
}

// =====================================================================
// Controller functions (one per address, see routes/blocks-routes.js)
// =====================================================================

// GET /api/blocks?q=punggol&flatType=4 ROOM&maxPrice=700000&minLease=60
// Search + filter. Sends every matching block (we only have a few hundred), cheapest first.
exports.searchBlocks = async (req, res) => {
  // The number filters must be numbers (or left out)
  const numberFields = ['maxPrice', 'minLease'];
  for (const field of numberFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }

  try {
    const filter = buildFilter(req.query);
    const blocks = await Block.find(filter);
    blocks.sort(compareByPrice);

    const results = [];
    for (const block of blocks) {
      results.push(toCard(block));
    }
    res.json({ total: results.length, results: results });
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/area
// Every town name in the database, for the search suggestions
exports.listTowns = async (req, res) => {
  try {
    const towns = await Block.distinct('town');
    res.json(towns);
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/nearby?lat=1.40&lng=103.90&radius=1000&limit=20&flatType=4 ROOM&maxPrice=700000&minLease=60
// GEOSPATIAL: blocks within `radius` metres of a point, closest first.
// flatType, maxPrice and minLease are optional: the same filters as the search, so near-a-place results fit them too.
exports.nearbyBlocks = async (req, res) => {
  // lat and lng must be numbers, and both must be sent
  const pointFields = ['lat', 'lng'];
  for (const field of pointFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }
  if (isBlank(req.query.lat) || isBlank(req.query.lng)) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  // radius, limit, maxPrice and minLease are optional, but must be numbers if sent
  const optionalFields = ['radius', 'limit', 'maxPrice', 'minLease'];
  for (const field of optionalFields) {
    const value = req.query[field];
    if (!isBlank(value) && !isNumber(value)) {
      return res.status(400).json({ message: field + ' must be a number' });
    }
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  // How far to look: 1000 m unless the URL says otherwise, and never more than 5000 m
  let radius = 1000;
  if (!isBlank(req.query.radius)) {
    radius = Number(req.query.radius);
  }
  if (radius > 5000) {
    radius = 5000;
  }

  // How many blocks to send: 20 unless the URL says otherwise, and never more than 50
  let limit = 100;
  if (!isBlank(req.query.limit)) {
    limit = Number(req.query.limit);
  }
  if (limit > 50) {
    limit = 50;
  }

  try {
    // $geoNear sorts by distance and adds a "distance" field in metres. Remember: [lng, lat].
    // query: only blocks that fit the filters (the same buildFilter as the search; empty filters are ignored)
    const blocks = await Block.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: radius,
          spherical: true,
          query: buildFilter(req.query),
        },
      },
      { $limit: limit },
    ]);

    const results = [];
    for (const block of blocks) {
      const card = toCard(block);
      card.distance = Math.round(block.distance);
      results.push(card);
    }
    res.json({ total: results.length, results: results });
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/:id/amenities
// Nearest MRT, hawker centre, park and school, with distance in metres.
exports.blockAmenities = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const amenities = await findNearestAmenities(block.location);
    res.json({ blockId: block._id, amenities: amenities });
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/:id/sales
// The recent sales behind the price range: month, storey, floor area, price and price per m2.
exports.blockSales = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const summary = salesSummary(block.sales);
    summary.blockId = block._id;
    res.json(summary);
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/:id
// One block, in the same shape as a search result card
exports.oneBlock = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    res.json(toCard(block));
  } catch (error) {
    sendError(res, error);
  }
};

// A real value from OneMap? (OneMap writes "NIL" or leaves it empty when a place has no block number / postal code)
function isRealValue(value) {
  if (value === undefined || value === null || value === '' || value === 'NIL') {
    return false;
  }
  return true;
}

// 1. GET /api/blocks/place?q=560314
// OneMap search: turns an address / postal code / place name into { name, lat, lng }.
// The frontend then calls /api/blocks/nearby?lat=..&lng=.. with it.
exports.findPlace = async (req, res) => {
  if (isBlank(req.query.q)){
    return res.status(400).json({ message: 'q is required'});
  }

  // OneMap does not understand "Blk", so a leading "Blk" / "Block" is removed before searching
  const searchText = removeBlkWord(String(req.query.q).trim());
  const words = toWords(searchText);

  try {
    // OneMap finds nothing when extra words are added at the end, like the town on our cards:
    // "405B NORTHSHORE DR PUNGGOL". So when it finds nothing, try again without the last word,
    // then without the last two ("405B NORTHSHORE DR" works). At least one word is always kept.
    let results = [];
    for (let dropCount = 0; dropCount <= 2; dropCount++) {
      if (results.length === 0 && words.length - dropCount >= 1) {
        const tryText = joinWords(words.slice(0, words.length - dropCount));
        const url =
          'https://www.onemap.gov.sg/api/common/elastic/search?returnGeom=Y&getAddrDetails=Y&searchVal=' +
          encodeURIComponent(tryText);
        const response = await fetch(url, { headers: { Authorization: await getOneMapToken() } });
        if (!response.ok){
          return res.status(502).json({message: 'Place search is unavailable' });
        }
        const data = await response.json();
        results = data.results;
      }
    }
    if (results.length === 0){
      return res.status(404).json({message: 'Place not found' });
    }

    const firstResult = results[0];

    // The name to show. When the user typed a block number or postal code (the search starts with a digit),
    // show the address ("BLK 314 ANG MO KIO AVENUE 3 (560314)"), because OneMap's own name is often the
    // estate's building name (e.g. "TECK GHEE EVERGREEN"), which looks like the wrong place.
    // Otherwise (an MRT station, a mall...), keep OneMap's own name ("BISHAN MRT STATION"),
    // since OneMap gives those a block number too.
    let name = firstResult.SEARCHVAL;
    if (startsWithDigit(searchText) && isRealValue(firstResult.BLK_NO) && isRealValue(firstResult.ROAD_NAME)) {
      name = 'BLK ' + firstResult.BLK_NO + ' ' + firstResult.ROAD_NAME;
      if (isRealValue(firstResult.POSTAL)) {
        name = name + ' (' + firstResult.POSTAL + ')';
      }
    }

    return res.json({
      name: name,
      lat: Number(firstResult.LATITUDE),
      lng: Number(firstResult.LONGITUDE)
    });
  } catch (error) {
    sendError(res, error);
  }
};


// 2. GET /api/blocks/:id/live-sales
// Latest sales for this block straight from data.gov.sg, in the same shape as /sales.
exports.liveSales = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    const params = new URLSearchParams({
      resource_id: 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc',
      filters: JSON.stringify({
        block: block.block,
        street_name: block.street,
        flat_type: block.flatType,
      }),
      sort: 'month desc',
      limit: '50',
    });

    let response;
    try {
      response = await fetch('https://data.gov.sg/api/action/datastore_search?' + params);
    } catch (fetchError) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    if (!response.ok) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    const data = await response.json();

    if (!data.result || !data.result.records || data.result.records.length === 0) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      return res.json(summary);
    }

    const sales = data.result.records.map(record => ({
      month: record.month,
      storey: record.storey_range,
      areaSqm: Number(record.floor_area_sqm),
      price: Number(record.resale_price)
    }));

    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    const cutoff = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const filteredSales = sales.filter(sale => sale.month >= cutoff);
    const CHART_START_MONTH = '2021-01';
    const history = sales.filter(sale => sale.month >= CHART_START_MONTH);

    if (filteredSales.length === 0) {
      const summary = salesSummary(block.sales);
      summary.blockId = block._id;
      summary.source = 'stored';
      summary.history = history;
      return res.json(summary);
    };

    const summary = salesSummary(filteredSales);
    summary.blockId = block._id;
    summary.source = 'live';
    summary.history = history;
    res.json(summary);

  } catch (error) {
    sendError(res, error);
  }
};


// 3. GET /api/blocks/:id/walk-to-mrt
// Real walking time to the nearest MRT from OneMap's routing service.
exports.walkToMrt = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    }

    if (walkCache[req.params.id] !== undefined) {
      return res.json(walkCache[req.params.id]);
    }


    // OneMap wants "lat,lng". MongoDB stores [lng, lat], so the order flips here.
    const start = block.location.coordinates[1] + ',' + block.location.coordinates[0];

    const found = await Amenity.aggregate([
      {
        $geoNear: {
          near: block.location,
          distanceField: 'distance',
          spherical: true,
          query: { category: 'mrt' },
        },
      },
      { $limit: 1 },
    ]);

    if (found.length === 0) {
      return res.status(404).json({ message: 'Nearest MRT station not found' });
    }
    const nearestMrt = found[0];
    const end = nearestMrt.location.coordinates[1] + ',' + nearestMrt.location.coordinates[0];

    const url =
      'https://www.onemap.gov.sg/api/public/routingsvc/route?start=' + start +
      '&end=' + end + '&routeType=walk';
    const response = await fetch(url, { headers: { Authorization: await getOneMapToken() } });
    if (!response.ok) {
      return res.json({ minutes: block.mrtWalkMinutes, source: 'estimate' });
    }
    const data = await response.json();

    if (!data || !data.route_summary) {
      return res.json({ minutes: block.mrtWalkMinutes, source: 'estimate' });
    }

    const minutes = Math.round(data.route_summary.total_time / 60);
    const metres = data.route_summary.total_distance;
    const result = { minutes, metres, source: 'onemap' };
    walkCache[req.params.id] = result;
    return res.json(result);
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/blocks/:id/estimate?storey=10&area=93
exports.estimate = async (req, res) => {
  try {
    const block = await Block.findById(req.params.id);
    if (block === null) {
      return res.status(404).json({ message: 'Block not found' });
    };

    if (priceModel.town[block.town] === undefined || priceModel.flatType[block.flatType] === undefined) {
      return res.status(400).json({ message: 'No estimate for this town or flat type' });
    };

    if (block.sales.length === 0) {
    return res.status(404).json({ message: 'No recent sales to base an estimate on' });
}

    // storey: from ?storey= if sent, otherwise from block.sales
    let storey;
    if (isBlank(req.query.storey)) {
    storey = storeyToNumber(block.sales[0].storey);
  } else if (!isNumber(req.query.storey)) {
    return res.status(400).json({ message: 'storey must be a number' });
  } else {
    storey = Number(req.query.storey);
        if (storey < 1 || storey > 75) {
        return res.status(400).json({ message: 'storey must be between 1 and 75' });
      }
  }

    // area:   from ?area= if sent, otherwise from block.sales
  let area;
    if (isBlank(req.query.area)) {
      area = block.sales[0].areaSqm;
  } else if (!isNumber(req.query.area)) {
    return res.status(400).json({ message: 'area must be a number' });
  } else {
    area = Number(req.query.area);
      if (area < 30 || area > 250) {
        return res.status(400).json({ message: 'area must be between 30 and 250 sqm' });
      }
  }

    const price = estimatePrice({
      town: block.town,
      flatType: block.flatType,
      storey: storey,
      leaseYears: blockModel.remainingLease(block.leaseCommenceYear),
      areaSqm: area,
      months: monthsSinceStart(),
    });

    res.json({
      blockId: block._id,
      estimate: Math.round(price / 1000) * 1000,
    });
  } catch (error) {
    sendError(res, error);
  }
};

