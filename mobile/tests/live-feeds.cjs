const {normalize} = require("../web/model.js");
async function check(section) {
  const response = await fetch("https://knowaiedge.fyi/api/" + section, {
    headers: {Accept: "application/json"}, signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(section + " returned HTTP " + response.status);
  const edition = normalize(section, await response.json());
  console.log(section + ": " + edition.items.length + " items, edition " + edition.updatedAt);
}
Promise.all(["news","repositories","watchlist"].map(check)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
