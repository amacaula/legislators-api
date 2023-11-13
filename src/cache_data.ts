import { Legislator, TypedAddress } from './types';
import { getAllLegislators } from './federal/members';
const fs = require("fs");

(async () => {
    let legislators = await getAllLegislators();

    fs.writeFileSync("./data/legislators.json", JSON.stringify(legislators));
    // legislators.forEach(legislator => console.log(JSON.stringify(legislator)));
})();

