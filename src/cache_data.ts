import { validateGovernment } from './utils/validation';
import { CanadaGovernmentProvider } from './federal/build_ca_federal';
const fs = require("fs");

// TODO later generalize once we have more than one government cached

(async () => {
    let gov = await (new CanadaGovernmentProvider()).build();
    validateGovernment(gov).forEach(issue => console.warn(JSON.stringify(issue)));

    // TODO next diff results with existing, detect if there are no differences to suspiciously too many differences
    // TODO next write each new file with a date and time stamp to a special directory and have separate logic to promote to current
    fs.writeFileSync("./data/ca-federal-government.json", JSON.stringify(gov.asGovernmentData(), null, 2));
})();

