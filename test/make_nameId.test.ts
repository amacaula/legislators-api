import { makeConstituencyNameId, makeNameId } from "../src/models";

describe('Making constituency name ids', () => {
    it('should remove . characters and convert spaces and long dashes to -', () => {
        expect(makeConstituencyNameId("St. Albert—Edmonton")).toEqual("st-albert-edmonton");
    });
    it('should remove accents and apostrophes', () => {
        expect(makeConstituencyNameId("Beauport—Côte-de-Beaupré—Île d'Orléans—Charlevoix"))
            .toEqual("beauport-cote-de-beaupre-ile-dorleans-charlevoix");
    });
});

describe('Making legislator name ids', () => {
    it('should include comma between first and last to clarify three word names', () => {
        expect(makeNameId("John C", "Clark")).toEqual("clark, john");
    });
    it('handled dashed last names', () => {
        expect(makeNameId("Xavier", "Barsalou-Duval")).toEqual("barsalou-duval, xavier");
    });
});