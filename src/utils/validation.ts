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