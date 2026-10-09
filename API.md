## Nearby blocks

GET /api/blocks/nearby

Send: lat, lng, radius, limit
Get back: list of block with walking distance

## Amenities near block
GET /api/blocks/:id/amenities

Get bacK: nearest mrt, hawker, park etc

## Get score for a block
GET /api/blocks/:id/score

Send: flatType (e.g. 4 ROOM), budget, and optional weights mrt, hawker, park, school, price, lease (0 to 5)
Get back: { blockId, score: 62.2, breakdown: { mrt: 0.39, hawker: 0.86, park: 0.67, school: 0.69, price: 0.8, lease: 0.37 } }
Score is out of 100. Breakdown values are 0 to 1.

## Errors
Replies look like { "error": "message" }
- 400: a value that should be a number is not (e.g. mrt=abc)
- 404: block not found
- 422: block has no coordinates yet