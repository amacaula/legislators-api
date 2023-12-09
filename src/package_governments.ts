import { GovernmentData } from "./types";
import { validateGovernment } from './utils/validation';
import { CanadaGovernmentProvider } from './federal/build_ca_federal';
const fs = require("fs");
import { diff } from 'deep-object-diff';


function countPropertyDiffs(diffs: any): number {
    let count = 0;
    for (const [key, value] of Object.entries(diffs)) {
        if (typeof value === 'object') {
            count += countPropertyDiffs(value);
        } else {
            count++;
        }
    }
    return count
}

// TODO later generalize once we have more than one government cached

(async () => {
    console.log("Extracting and packaging Canada Federal Government...");
    let gov = await (new CanadaGovernmentProvider()).build();
    const relativeFilename = `data/${gov.id}.json`;
    let haveNewData = true;
    if (fs.existsSync(relativeFilename)) {
        const previousGovData: GovernmentData = require(`../../${relativeFilename}`) as GovernmentData;
        const differences: any = diff(previousGovData, gov.asGovernmentData());
        const propertyDiffs = countPropertyDiffs(differences);
        if (propertyDiffs === 0) {
            haveNewData = false;
            console.log("No changes in government data -- finished.");
        } else {
            console.log(`Changes in government data: ${propertyDiffs} property differences`);
        }
    }

    if (haveNewData) {
        let issues = validateGovernment(gov);
        issues.forEach(issue => console.warn(JSON.stringify(issue)));

        if (issues.length < 10) {
            console.log(`Writing out new government data to ${relativeFilename}`);
            fs.writeFileSync(`./${relativeFilename}`, JSON.stringify(gov.asGovernmentData(), null, 2));
        } else {
            console.error("Too many issues with the government data to save it.");
        }
    }
})();

