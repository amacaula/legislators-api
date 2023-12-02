// for weird cases where we want to see every character code logged
export function logChars(str: string) {
    str.split("").forEach((c, i) => console.log(i, c, c.charCodeAt(0)));
}