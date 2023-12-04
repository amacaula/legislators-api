import { validateGovernment } from './utils/validation';
import { buildGovernment as getCanadianGovernment } from './federal/build_ca_federal';
const fs = require("fs");

// TODO later generalize once we have more than one government cached

(async () => {
    let gov = await getCanadianGovernment();
    let issues = validateGovernment(gov);
    issues.forEach(i => console.warn(JSON.stringify(i)));

    // TODO next diff results with existing, detect if there are no differences to suspiciously too many differences
    // TODO next write each new file with a date and time stamp to a special directory and have separate logic to promote to current
    fs.writeFileSync("./data/ca-federal-government.json", JSON.stringify(gov.asGovernmentData(), null, 2));
})();

