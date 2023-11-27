import { validateLegislators } from './utils/validation';
import { getGovernment as getCanadianGovernment } from './federal/build_ca_federal';
const fs = require("fs");

// TODO updates so that all needed main files are retrieved from source and cached
// TODO generalize once we have more than one government cached

(async () => {
    let gov = await getCanadianGovernment();
    let issues = validateLegislators(gov.legislators, 338);
    issues.forEach(i => console.warn(JSON.stringify(i)));

    // TODO be smarter with JSON.stringify to avoid circular dependencies between Constituency to Legislator
    fs.writeFileSync("./data/ca-federal-government.json", JSON.stringify(gov, null, 2));
})();

