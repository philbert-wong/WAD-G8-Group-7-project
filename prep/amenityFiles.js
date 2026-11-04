// Downloads the government datasets once and turns them into simple { category, name, lat, lng } rows.
import { parse } from 'csv-parse/sync';
import { wait } from './wait.js';

const BULK = 'https://api-open.data.gov.sg/v1/public/api/datasets';

export const DATASETS = {
  hawker: 'd_4a086da0a5553be1d89383cd90d07ecd', // NEA hawker centres (GeoJSON)
  park: 'd_0542d48f0991541706b58059381a6eca', // NParks parks (GeoJSON)
  school: 'd_688b934f82c1059ed0a6993d2a829089', // MOE schools (CSV, postal codes only)
};

// Every kind of "space" character: normal space, tab, new line, non-breaking space, and so on
const WHITESPACE =
  ' \t\n\r\f\v             ' +
  '    　﻿';

// Letters, digits and _ count as "word" characters (used to find "P1" as a whole word)
const WORD_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

const DIGITS = '0123456789';

// data.gov.sg makes a download in two steps: ask for it, then wait until a link is ready.
// It rejects fast repeat requests, so we retry slowly.
export async function downloadDataset(id) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const start = await fetch(BULK + '/' + id + '/initiate-download');
      if (!start.ok) {
        throw new Error('initiate-download ' + start.status);
      }

      for (let poll = 0; poll < 20; poll++) {
        await wait(3000);
        const check = await fetch(BULK + '/' + id + '/poll-download');
        if (!check.ok) {
          throw new Error('poll-download ' + check.status);
        }

        // The link appears in { data: { url: "..." } } once the file is ready
        const body = await check.json();
        let url = null;
        if (body && body.data && body.data.url) {
          url = body.data.url;
        }

        if (url) {
          const file = await fetch(url);
          if (!file.ok) {
            throw new Error('file ' + file.status);
          }
          return await file.text();
        }
      }
      throw new Error('download never became ready');
    } catch (error) {
      if (attempt === 6) {
        throw error;
      }
      console.log('  ' + error.message + '; waiting before retry ' + attempt + '/5');
      await wait(12000);
    }
  }
}

// Turns every run of spaces / tabs / new lines into one space, and removes spaces at both ends.
// "  Ang  Mo\nKio " -> "Ang Mo Kio"
function tidy(text) {
  if (text === undefined || text === null) {
    return '';
  }

  let result = '';
  let lastWasSpace = false;
  for (const character of String(text)) {
    if (WHITESPACE.includes(character)) {
      if (!lastWasSpace) {
        result = result + ' ';
      }
      lastWasSpace = true;
    } else {
      result = result + character;
      lastWasSpace = false;
    }
  }
  return result.trim();
}

// Some files hide the name inside an HTML table in "Description", like:
//   <th>NAME</th> <td>Bishan Park</td>
// This finds the text between <td> and </td> that comes right after <th>NAME</th>.
function nameFromDescription(description) {
  const header = '<th>NAME</th>';
  let headerAt = description.indexOf(header);

  while (headerAt !== -1) {
    // skip any spaces between </th> and <td>
    let position = headerAt + header.length;
    while (position < description.length && WHITESPACE.includes(description[position])) {
      position = position + 1;
    }

    if (description.slice(position, position + 4) === '<td>') {
      const valueStart = position + 4;
      const valueEnd = description.indexOf('<', valueStart);
      if (valueEnd !== -1 && description.slice(valueEnd, valueEnd + 5) === '</td>') {
        return tidy(description.slice(valueStart, valueEnd));
      }
    }

    // not the right shape here: try the next <th>NAME</th>, if there is one
    headerAt = description.indexOf(header, headerAt + 1);
  }
  return '';
}

// The name of a place: the NAME field, or else the name inside the Description table
function nameOf(properties) {
  if (properties.NAME) {
    return tidy(properties.NAME);
  }

  let description = '';
  if (properties.Description !== undefined && properties.Description !== null) {
    description = properties.Description;
  }
  return nameFromDescription(description);
}

// GeoJSON file -> [{ category, name, lat, lng }]
export function parsePoints(geojsonText, category) {
  const data = JSON.parse(geojsonText);
  let features = [];
  if (data.features) {
    features = data.features;
  }

  const rows = [];
  for (const feature of features) {
    if (feature.geometry && feature.geometry.type === 'Point') {
      // GeoJSON stores [longitude, latitude]
      const lng = feature.geometry.coordinates[0];
      const lat = feature.geometry.coordinates[1];

      let properties = {};
      if (feature.properties) {
        properties = feature.properties;
      }
      const name = nameOf(properties);

      if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
        rows.push({ category: category, name: name, lat: lat, lng: lng });
      }
    }
  }
  return rows;
}

// Is "P1" in this text as a whole word? ("P1" or "MIXED LEVEL (P1-S4)" yes, "SP1" or "P10" no)
function hasWordP1(text) {
  const upper = text.toUpperCase();
  let foundAt = upper.indexOf('P1');
  while (foundAt !== -1) {
    const after = upper.slice(foundAt + 2, foundAt + 3); // '' at the very end

    // The letter before "P1" must not be part of a word (or "P1" is at the very start)
    let startsWord = false;
    if (foundAt === 0) {
      startsWord = true;
    } else if (!WORD_CHARACTERS.includes(upper[foundAt - 1])) {
      startsWord = true;
    }

    // The letter after "P1" must not be part of a word (or "P1" is at the very end)
    let endsWord = false;
    if (after === '') {
      endsWord = true;
    } else if (!WORD_CHARACTERS.includes(after)) {
      endsWord = true;
    }

    if (startsWord && endsWord) {
      return true;
    }
    foundAt = upper.indexOf('P1', foundAt + 1);
  }
  return false;
}

// Is this school level a primary school? ("PRIMARY", or "P1" as a whole word)
function isPrimaryLevel(levelCode) {
  let text = '';
  if (levelCode !== undefined && levelCode !== null) {
    text = String(levelCode);
  }
  if (text.toUpperCase().includes('PRIMARY')) {
    return true;
  }
  return hasWordP1(text);
}

// Puts zeros in front until the text is long enough: "88256" -> "088256"
function addLeadingZeros(text, length) {
  let result = text;
  while (result.length < length) {
    result = '0' + result;
  }
  return result;
}

// True when the text is exactly 6 digits, like a Singapore postal code
function isSixDigits(text) {
  if (text.length !== 6) {
    return false;
  }
  for (const character of text) {
    if (!DIGITS.includes(character)) {
      return false;
    }
  }
  return true;
}

// School CSV -> [{ name, postal }] for primary schools only
export function parseSchools(csvText) {
  const rows = parse(csvText, { columns: true, skip_empty_lines: true });

  const schools = [];
  for (const row of rows) {
    if (isPrimaryLevel(row.mainlevel_code)) {
      const name = tidy(row.school_name);
      const postal = addLeadingZeros(tidy(row.postal_code), 6); // 88256 -> 088256
      if (name && isSixDigits(postal)) {
        schools.push({ name: name, postal: postal });
      }
    }
  }
  return schools;
}
