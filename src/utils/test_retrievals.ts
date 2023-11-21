import { lookupLegislatorAndConsitituencyNamesByPostal } from "../federal/members";

(async () => {
    try {
        let [leg, con] = await lookupLegislatorAndConsitituencyNamesByPostal("xxx xxx");
        console.log(leg, con);
    } catch (e) {
        console.error(e);
    }
})();
