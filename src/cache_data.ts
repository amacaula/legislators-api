import { validateLegislators } from './federal/validate';
import { getAllLegislators } from './federal/members';
const fs = require("fs");

// TODO updates so that all needed main files are retrieved from source

(async () => {
    let legislators = await getAllLegislators();
    let issues = validateLegislators(legislators);
    issues.forEach(i => console.warn(JSON.stringify(i)));

    fs.writeFileSync("./data/federal-legislators.json", JSON.stringify(legislators));
})();

