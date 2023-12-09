import { Government } from "./models";

// --- Government and Legislature ---

export type GovernmentBuilderFactory = {
    // static availableGovernments: () => Array<GovernmentMetadata>
    build: (metadata: GovernmentMetadata, config?: any) => Promise<Government>
}

export enum GovernmentLevel {
    Federal = "federal",
    Regional = "regional",
    Municipal = "municipal"
}

export type LegislatorLookupProvider = {
    lookupLegislatorAndConsitituencyNamesByPostal: (postal: string) => Promise<[string, string]>
}

export type GovernmentMetadata = {
    id: string
    level: GovernmentLevel
    name: string
    country: string
    region: string | null
    legislature: Legislature
    expectedConstituencies: number
}

export type GovernmentData = GovernmentMetadata & {
    constituencies: Array<ConstituencyData>
    legislators: Array<LegislatorData>
}

export function isGovernmentData(data: GovernmentData | GovernmentMetadata): data is GovernmentData {
    return (data as GovernmentData).constituencies !== undefined;
}

export type Legislature = {
    name: string
    address: TypedAddress
    urls: LegislatureURLs
    email: string
}

export type LegislatureURLs = {
    website: string
}

// --- Legislators ---

export type LegislatorData = {
    id: string
    honorific: string | null
    firstName: string
    lastName: string
    nameId: string
    isCurrent: boolean
    party: string
    fromDate: string
    email: string
    addresses: Array<TypedAddress>
    urls: LegislatorURLs
    constituencyNameId: string // TODO next rename and retype
}

export type ConstituencyData = {
    id: string
    nameId: string
    name: string
    country: string
    region: string
    municipality: string | null
    legislatorNameId: string // TODO next rename and retype
}

export type TypedAddress = {
    type: AddressType
    physical: string | null
    phone: string
    fax: string | null
}

export enum AddressType {
    Central = "central",
    Local = "local",
    MainLocal = "main-local",
}

export type LegislatorURLs = {
    contact: string
    website: string
}