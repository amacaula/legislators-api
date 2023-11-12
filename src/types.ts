export type Legislator = {
    id: string,
    firstName: string,
    lastName: string,
    isCurrent: boolean,
    addresses: Array<TypedAddress>
    province: string
    constituency: string
    party: string
    fromDate: string
}
export type TypedAddress = {
    type: string,
    physical: string | null,
    phone: string,
    fax: string | null
}