import {
    AddressType, GovernmentLevel, GovernmentData, GovernmentMetadata, isGovernmentData, Constituency,
    Legislature, Legislator, LegislatorURLs, LegislatorLookupProvider
} from "./types";

// TODO next replace id, nameId with surrogateKey and naturalKey?

export class Government {
    readonly id!: string;
    readonly level!: GovernmentLevel;
    readonly name!: string;
    readonly country!: string;
    readonly region: string | null;
    readonly legislature: Legislature;
    readonly expectedConstituencies: number;
    constituencies: Array<Constituency>;
    constituenciesByNameId: Map<string, Constituency>;
    legislators: Array<Legislator>;
    legislatorsByNameId: Map<string, Legislator>;
    lookupProvider!: LegislatorLookupProvider;

    // Constructor works with either of two input data types
    constructor(data: GovernmentMetadata | GovernmentData) {
        this.id = data.id;
        this.level = data.level;
        this.name = data.name;
        this.country = data.country;
        this.region = data.region;
        this.legislature = data.legislature;
        this.expectedConstituencies = data.expectedConstituencies;
        this.lookupProvider = data.lookupProvider;
        this.legislatorsByNameId = new Map<string, Legislator>();
        this.constituenciesByNameId = new Map<string, Constituency>();

        if (isGovernmentData(data)) {
            this.legislators = data.legislators;
            this.constituencies = data.constituencies;
            this.legislators.forEach(l => this.legislatorsByNameId.set(l.nameId, l));
            this.constituencies.forEach(l => this.constituenciesByNameId.set(l.nameId, l));
        } else {
            this.legislators = new Array<Legislator>();
            this.constituencies = new Array<Constituency>();
        }
    }

    finish(prune: boolean): void {
        this.legislatorsByNameId.forEach(l => { this.legislators.push(l) });
        if (!prune) {
            this.constituenciesByNameId.forEach(l => { this.constituencies.push(l) });
        } else {
            this.constituenciesByNameId.forEach(c => {
                if (c.legislatorNameId !== "VACANT") {
                    this.constituencies.push(c);
                } else {
                    this.constituenciesByNameId.delete(c.nameId);
                }
            });
        }
    }

    asGovernmentData(): GovernmentData {
        return (({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators, lookupProvider }) =>
            ({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators, lookupProvider }))(this);
    }

    async getConsitituencyByPostal(postal: string) {
        let [legName, conName] = await this.lookupProvider
            .lookupLegislatorAndConsitituencyNamesByPostal(postal);
        return this.constituencies.find(c => c.name === conName) as Constituency;
    }
    getLegislatorByFullName(first: string, last: string) {
        let nameId = makeNameId(first, last);
        return this.legislators.find(l => l.nameId === nameId) as Legislator;
    }
    searchLegistlatorsByPartialNames(partial: string) {
        return new Array<Legislator>(); // TODO later implement
    }
}

// ------------------------- Legislators and Constituencies -------------------------

// TODO next allow navigation from Constituency to Legislator and vice versa by making them classes

export function defaultLegislator(first: string, last: string): Legislator {
    return {
        id: "", nameId: makeNameId(first, last), firstName: first, lastName: last, honorific: "",
        isCurrent: true, fromDate: "",
        party: "", email: "",
        addresses: [], urls: {} as LegislatorURLs,
        constituencyNameId: "UNKNOWN",
    } as Legislator;
}

export function defaultConstituency(name: string): Constituency {
    return {
        id: "",
        nameId: makeConstituencyNameId(name),
        name: name,
        country: "Canada",
        region: "",
        municipality: null,
        legislatorNameId: "VACANT"
    }
}

// TODO next update to use remove accents function below
export function standardizeName(name: string): string {
    // Remove any trailing initials
    if (name.endsWith(".")) return name.substring(0, name.length - 3);
    // TODO next replace double spaces with one space
    // TODO later generalize for any order of first and last names
    return name;
}

export function makeNameId(first: string, last: string): string {
    let firstNames = first.split(" ");
    if (firstNames.length > 1) first = firstNames[0]; // use only first name in key
    let lastNames = last.split(" ");
    if (lastNames.length > 1) last = lastNames[1]; // use only last word of last name in key
    return removeAccents(`${last.toLowerCase()}, ${first.toLowerCase()}`);
}

export function makeConstituencyNameId(name: string): string {
    return removeSpecialChars(removeAccents(name.trim().toLowerCase()));
}

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function removeSpecialChars(str: string): string {
    return str.replace(/\.|\'/g, '').replace(/\s|—|—'/g, '-') // many dash types
}
