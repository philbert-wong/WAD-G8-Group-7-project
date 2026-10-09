/**
 * Converts a Block document into exactly the shape the frontend was promised
 * in Week 5. Keeping this in one function means the promise is kept in one place.
 * OWNER: Backend & Database
 */
export function blockToApiShape(doc, { flatType } = {}) {
  const stats = doc.stats instanceof Map ? Object.fromEntries(doc.stats) : (doc.stats || {});

  // If the user filtered to one flat type, report that type's numbers.
  // Otherwise report 4 ROOM — the most common HDB flat — so blocks are compared
  // like for like on the map, falling back to the type with the most sales.
  const chosen = flatType
    ? stats[flatType]
    : stats["4 ROOM"] ?? Object.values(stats).sort((a, b) => (b?.txnCount ?? 0) - (a?.txnCount ?? 0))[0];

  const [lng, lat] = doc.location?.coordinates ?? [null, null];
  const a = doc.amenityAccess;

  return {
    id:         String(doc._id),
    block:      doc.block,
    streetName: doc.streetName,
    town:       doc.town,
    lat,
    lng,
    medianPrice: chosen?.medianPrice ?? null,
    medianPsm:   chosen?.medianPsm ?? null,
    txnCount:    chosen?.txnCount ?? 0,
    remainingLeaseYears: doc.remainingLeaseYears ?? null,
    nearestMrt: doc.nearestMrt
      ? { name: doc.nearestMrt.name, walkMinutes: doc.nearestMrt.walkMinutes }
      : null,
    // Metres to the nearest of each amenity kind; null where we don't know.
    amenityAccess: a ? {
      school:     a.school ?? null,
      park:       a.park ?? null,
      hawker:     a.hawker ?? null,
      healthcare: a.healthcare ?? null,
      eldercare:  a.eldercare ?? null,
    } : null,
  };
}
