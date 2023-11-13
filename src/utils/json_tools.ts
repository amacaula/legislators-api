// Not sure this is the way to go. There isn't much conceptual difference between object and Map. And if the keys
// are constrained then better off to use a typed Object.

export function replacer(key: string, value: any) {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
}

export function reviver(key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}

const serialized = JSON.stringify({ "map": new Map([['foo', 'bar']]) }, replacer)
console.log(`serialized as: ${serialized}`);

const deserialized = JSON.parse(serialized, reviver);
console.log(`${deserialized.map.get('foo')} should be "bar"`);