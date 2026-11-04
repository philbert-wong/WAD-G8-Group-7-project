// Pauses for some milliseconds, e.g.  await wait(1000)  waits one second.
// OneMap and data.gov.sg ask us not to send requests too quickly, so the prep scripts wait between them.
//
// setTimeout(resolve, milliseconds) runs "resolve" later. Wrapping it in a Promise is what lets us
// use "await" on it, so the script stops at that line until the time is up.
export function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}
