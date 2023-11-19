import { Legislator, TypedAddress } from './types';
import { getAllLegislators } from './federal/members';
const fs = require("fs");

// TODO updates so that all needed main files are retrieved from source

(async () => {
    let legislators = await getAllLegislators();

    fs.writeFileSync("./data/federal-legislators.json", JSON.stringify(legislators));
})();

