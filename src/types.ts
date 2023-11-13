import { type } from "os"

export type Legislator = {
    id: string
    honorific: string
    firstName: string
    lastName: string
    nameId: string
    isCurrent: boolean
    addresses: Array<TypedAddress>
    province: string
    constituency: string
    party: string
    fromDate: string
    urls: LegislatorURLs
}
export type TypedAddress = {
    type: string
    physical: string | null
    phone: string
    fax: string | null
}

export type LegislatorURLs = {
    contact: string
    website: string
}