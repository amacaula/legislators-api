import {
    TypedAddress, GovernmentLevel, GovernmentData, GovernmentMetadata, isGovernmentData, ConstituencyData,
    Legislature, LegislatorData, LegislatorURLs, LegislatorLookupProvider
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
    constituencies: Array<ConstituencyData>;
    constituenciesByNameId: Map<string, ConstituencyData>;
    legislators: Array<LegislatorData>;
    legislatorsByNameId: Map<string, LegislatorData>;
    lookupProvider!: LegislatorLookupProvider;

    // Constructor works with either of two input data types
    constructor(data: GovernmentMetadata | GovernmentData, lookupProvider: LegislatorLookupProvider) {
        this.id = data.id;
        this.level = data.level;
        this.name = data.name;
        this.country = data.country;
        this.region = data.region;
        this.legislature = data.legislature;
        this.expectedConstituencies = data.expectedConstituencies;
        this.legislatorsByNameId = new Map<string, LegislatorData>();
        this.constituenciesByNameId = new Map<string, ConstituencyData>();
        this.lookupProvider = lookupProvider;

        if (isGovernmentData(data)) {
            this.legislators = data.legislators;
            this.constituencies = data.constituencies;
            this.legislators.forEach(l => this.legislatorsByNameId.set(l.nameId, l));
            this.constituencies.forEach(l => this.constituenciesByNameId.set(l.nameId, l));
        } else {
            this.legislators = new Array<LegislatorData>();
            this.constituencies = new Array<ConstituencyData>();
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
        return (({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators }) =>
            ({ id, level, name, country, region, legislature, expectedConstituencies, constituencies, legislators }))(this);
    }

    async getConsitituencyByPostal(postal: string) {
        let [legName, conName] = await this.lookupProvider
            .lookupLegislatorAndConsitituencyNamesByPostal(postal);
        return this.constituencies.find(c => c.name === conName) as ConstituencyData;
    }
    getLegislatorByFullName(first: string, last: string) {
        let nameId = makeNameId(first, last);
        return this.legislators.find(l => l.nameId === nameId) as LegislatorData;
    }
    searchLegistlatorsByPartialNames(partial: string) {
        return new Array<LegislatorData>(); // TODO later implement
    }
}

export class Legislator {
    readonly government: Government;
    readonly id!: string;
    readonly nameId!: string;
    readonly firstName!: string;
    readonly lastName!: string;
    readonly honorific: string | null;
    readonly isCurrent!: boolean;
    readonly party!: string;
    readonly fromDate!: string;
    readonly email: string;
    readonly addresses: Array<TypedAddress>;
    readonly urls: LegislatorURLs;
    readonly constituency: Constituency;

    constructor(data: LegislatorData, government: Government) {
        this.government = government;
        this.id = data.id;
        this.nameId = data.nameId;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
        this.honorific = data.honorific;
        this.isCurrent = data.isCurrent;
        this.party = data.party;
        this.fromDate = data.fromDate;
        this.email = data.email;
        this.addresses = data.addresses;
        this.urls = data.urls;
        this.constituency = new Constituency(government.constituenciesByNameId.get(data.constituencyNameId) as ConstituencyData, government);
    }
}

export class Constituency {
    readonly government: Government;
    readonly id!: string;
    readonly nameId!: string;
    readonly name!: string;
    readonly country!: string;
    readonly region!: string;
    readonly municipality: string | null;
    readonly legislator: Legislator | null;

    constructor(data: ConstituencyData, government: Government, legislator: Legislator | null = null) {
        this.government = government;
        this.id = data.id;
        this.nameId = data.nameId;
        this.name = data.name;
        this.country = data.country;
        this.region = data.region;
        this.municipality = data.municipality;
        if (legislator) {
            this.legislator = legislator;
        } else {
            this.legislator = new Legislator(government.legislatorsByNameId.get(data.legislatorNameId) as LegislatorData, government);
        }
    }
}

// ------------------------- Legislators and Constituencies -------------------------

// TODO next allow navigation from Constituency to Legislator and vice versa by making them classes

export function defaultLegislator(first: string, last: string): LegislatorData {
    return {
        id: "", nameId: makeNameId(first, last), firstName: first, lastName: last, honorific: "",
        isCurrent: true, fromDate: "",
        party: "", email: "",
        addresses: [], urls: {} as LegislatorURLs,
        constituencyNameId: "UNKNOWN",
    } as LegislatorData;
}

export function defaultConstituency(name: string): ConstituencyData {
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
