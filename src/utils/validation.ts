import { getGovernmentbyId } from '../legislator_api/government_finder';
import { Government } from '../models';
import { Legislator, AddressType, Constituency } from '../types';

export type KeyedIssue = {
    key: string
    fieldName: string
    issue: string
}

export function makeIssue(key: string, fieldName: string, issue: string): KeyedIssue {
    return {
        key: key,
        fieldName: fieldName,
        issue: issue
    }
}

export function validateLegislators(legislators: Legislator[], expectedNum: number): KeyedIssue[] {
    let issues = new Array<KeyedIssue>();

    if (legislators.length != expectedNum) {
        issues.push({
            key: "<all>",
            fieldName: "legislators",
            issue: `There are ${legislators.length} legislators which is less than expected value: 338`
        });
    }

    // TODO check validate data before updating the cache that serves graphql queries
    legislators.forEach(leg => {
        // Legislator with no id
        if (!leg.id) {
            issues.push(makeIssue(leg.id, "id", `Legislator with lastName ${leg.lastName} has empty id`));
            return; // don't bother with others for this case
        }

        // Check addresses
        let addrs = leg.addresses;
        let foundTypes = addrs.map(a => a.type);
        [AddressType.Central, AddressType.MainLocal].forEach(t => {
            if (foundTypes.includes(t)) {
                let physical = addrs.filter(a => a.type == t)[0]?.physical;
                if (physical == null) {
                    issues.push(makeIssue(leg.id, "addresses", `Legislator ${leg.id} has no ${t} physical address`));
                } else {
                    if (physical.split("\n").length < 3)
                        issues.push(makeIssue(leg.id, "addresses", `Legislator ${leg.id} physical address has <3 lines`));
                }
            } else {
                issues.push(makeIssue(leg.id, "addresses", `Legislator ${leg.id} has no ${t} address`));
            }
        });

        // Check email
        if (!leg.email)
            issues.push(makeIssue(leg.id, "email", `Legislator ${leg.id} has no email`));
    });

    return issues;
}

async function checkFederalGovernment() {
    let gov = await getGovernmentbyId("ca.federal");
    let legislators: Legislator[]
    let cons: Constituency

    try {
        legislators = gov.legislators;
        cons = await gov.getConsitituencyByPostal("V5W 3H8");
    } catch (err) {
        console.error(err);
        return;
    }
    let issues = validateLegislators(legislators, 338);
    if (issues.length > 0) {
        console.log(`Found ${issues.length} issues:`);
        issues.forEach(i => console.warn(JSON.stringify(i)));
    } else {
        console.log("No issues found");
    }

    console.log(`Found constituency ${cons.name}`);

}

(async () => {
    console.log("Checking cached government data...");
    await checkFederalGovernment();
})();