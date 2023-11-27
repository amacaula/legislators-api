import { lookupLegislatorAndConsitituencyNamesByPostal } from "../federal/lookups";

(async () => {
    try {
        let [leg, con] = await lookupLegislatorAndConsitituencyNamesByPostal("V5W 3H8");
        console.log(leg, con);
    } catch (e) {
        console.error(e);
    }
})();
