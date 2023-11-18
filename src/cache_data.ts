import { Legislator, TypedAddress } from './types';
import { getAllLegislators } from './federal/members';
const fs = require("fs");

// TODO updates so that all needed main files are retrieved from source

(async () => {
    let legislators = await getAllLegislators();

    fs.writeFileSync("./data/legislators.json", JSON.stringify(legislators));
    // legislators.forEach(legislator => console.log(JSON.stringify(legislator)));
})();

// TODO check validate data before updating the cache that serves graphql queries
// TODO validate there are 338 legislators
// TODO validate each legislator has needed addresses

