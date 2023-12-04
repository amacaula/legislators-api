import { validateGovernment } from './utils/validation';
import { buildGovernment as getCanadianGovernment } from './federal/build_ca_federal';
const fs = require("fs");

// TODO generalize once we have more than one government cached

(async () => {
    let gov = await getCanadianGovernment();
    let issues = validateGovernment(gov);
    issues.forEach(i => console.warn(JSON.stringify(i)));

    fs.writeFileSync("./data/ca-federal-government.json", JSON.stringify(gov.asGovernmentData(), null, 2));
})();

