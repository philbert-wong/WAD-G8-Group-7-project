# What I need to make

Three small things, each a real piece of the back-end. For each one there is:

- a **stub** file with a function that throws `Not written yet` — I write the body
- a **test** file that says exactly what the function must do — I do not edit it
- a **README** with the idea, hints, and what "done" means

```bash
npm run my-work          # run all three
npx vitest run my-work/exercises/1-haversine    # run one
```

They all fail at first. Make them go green one by one.

| # | Exercise | Skill it builds | Responsibility |
|---|---|---|---|
| 1 | [`1-haversine`](1-haversine/) | Maths in JavaScript; a pure function | Amenity distance |
| 2 | [`2-listings-filter`](2-listings-filter/) | Turning a URL query into a MongoDB query | Block search & filter endpoints |
| 3 | [`3-score`](3-score/) | Weighted scoring; null-handling | Personalised score |

**Rules for myself:** write it before looking at the real version. When stuck, read the
test failure message first, then the hints, then — last — the real implementation in the app.
After it passes, compare mine with the app's and note one difference.
