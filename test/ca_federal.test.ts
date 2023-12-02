import { lookupLegislatorAndConsitituencyNamesByPostal } from "../src/federal/lookups";

describe('Fetching canadian government data', () => {
    it('should work', () => {
        expect(true).toBeTruthy();
    });
    it('should find Vancouver Kingsway fetching by postal V5W 3H8', async () => {
        try {
            let [ignore, consName] = await lookupLegislatorAndConsitituencyNamesByPostal("V5W 3H8");
            expect(consName).toEqual("Vancouver Kingsway");
        } catch (err) {
            fail(err as Error);
        }
    });
});