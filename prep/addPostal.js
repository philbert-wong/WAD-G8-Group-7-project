// Adds each block's postal code (from OneMap) to every card in server/data/blocks.json as  postal: "560323".
// The seed copies it into MongoDB, so typing a postal code in the search box finds our own block
// instead of always asking OneMap.
//
//   cd prep
//   node addPostal.js     (about 15 minutes the first time; every answer is saved in prep/geocode-cache.json,
//                          the same cache makeData.js uses, so running it again is quick)
// then, in the server folder:  pnpm seed
import { readFileSync, writeFileSync } from 'node:fs';
import { findPoint, saveCache } from './oneMap.js';

const BLOCKS_FILE = new URL('../server/data/blocks.json', import.meta.url);

const blocksText = readFileSync(BLOCKS_FILE, 'utf8');
const blocksData = JSON.parse(blocksText);
// Windows line endings (\r\n) in the file? Then write it back the same way, so git only shows the new lines
const windowsLineEndings = blocksText.includes('\r\n');

// True when the text is exactly 6 digits, like "560323" (OneMap writes "NIL" when a place has no postal code)
function isPostalCode(text) {
  if (typeof text !== 'string' || text.length !== 6) {
    return false;
  }
  for (const character of text) {
    if (character < '0' || character > '9') {
      return false;
    }
  }
  return true;
}

// Every flat type of a block has the same postal code, so group the cards by address and look up each block once
const addresses = {}; // { "314|ANG MO KIO AVE 3": [card, card], ... }
const addressKeys = [];
for (const card of blocksData.blocks) {
  const key = card.block + '|' + card.street;
  if (addresses[key] === undefined) {
    addresses[key] = [];
    addressKeys.push(key);
  }
  addresses[key].push(card);
}
console.log('Looking up the postal codes of ' + addressKeys.length + ' blocks on OneMap...');

let done = 0;
let missing = 0;
for (const key of addressKeys) {
  const cards = addresses[key];
  const wanted = cards[0];

  // Only accept a OneMap result with the same block number (same check as makeData.js)
  function isSameBlock(hit) {
    return String(hit.BLK_NO).toUpperCase() === wanted.block.toUpperCase();
  }

  // Same search text as makeData.js, so the blocks it already looked up come straight from the cache
  const point = await findPoint(wanted.block + ' ' + wanted.street, isSameBlock);

  // Save it on every flat type of this block (no postal code found = no postal; search then falls back to OneMap)
  let postal = null;
  if (point && isPostalCode(point.postal)) {
    postal = point.postal;
  }
  for (const card of cards) {
    if (postal !== null) {
      card.postal = postal;
    } else {
      delete card.postal;
    }
  }
  if (postal === null) {
    missing = missing + 1;
    console.log('  no postal code for Blk ' + wanted.block + ' ' + wanted.street);
  }

  done = done + 1;
  if (done % 50 === 0) {
    console.log('  ' + done + ' / ' + addressKeys.length + ' blocks');
  }
}
saveCache();

let newText = JSON.stringify(blocksData, null, 1);
if (windowsLineEndings) {
  newText = newText.replaceAll('\n', '\r\n');
}
writeFileSync(BLOCKS_FILE, newText);
console.log('Saved postal codes for ' + (addressKeys.length - missing) + ' blocks (' + missing + ' without one).');
console.log('Now run  pnpm seed  in the server folder.');
