// ----------------------- General types and functions ------------------
type ID = string;
function validateFormatPhone(phone: string): string {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

    if (phoneRegex.test(phone)) {
        var formattedPhoneNumber =
            phone.replace(phoneRegex, "($1) $2-$3");
    } else {
        return `${phone} INVALID`;
    }
    return phone
}

// For building up a person data structure gradually
type DraftPerson = {
    surrogateKey?: ID; // not typically available in first data retrieved
    naturalKey: string;
    name: string;
    birthday?: string | Date; // assigned as string initially
    house?: DraftHouse;
}
function startPerson(name: string, birthday?: string | Date, house?: DraftHouse): DraftPerson {
    let naturalKey = makeNaturalKey(name);
    return { naturalKey, name, birthday, house };
}
function makeNaturalKey(name: string): string {
    return name.toLowerCase().replace(/ /g, "-");
}

// For the final person data structure exposed through APIs
interface Person extends DraftPerson {
    surrogateKey: ID; // now required
    birthday: Date; // now must be date
    house: House; // now a House and required
}
class PersonImpl implements Person {
    naturalKey: string;
    constructor(public surrogateKey: ID, public name: string, public birthday: Date, public house: House) {
        Object.assign(this, { surrogateKey, name, birthday, house });
        this.naturalKey = makeNaturalKey(this.name);
        this.house.owner = this;
    }
    static makePerson(draft: DraftPerson): PersonImpl {
        let { surrogateKey, name, birthday, house } = draft;
        let upgradedHouse, upgradedBirthday;
        if (house) {
            upgradedHouse = HouseImpl.makeHouse(house);
        } else {
            throw new Error("house is required");
        }
        if (!surrogateKey) throw new Error("surrogateKey is required");
        if (!birthday) throw new Error("birthday is required");
        upgradedBirthday = (birthday instanceof Date) ? birthday : new Date(Date.parse(birthday));

        let person = new PersonImpl(surrogateKey, name, upgradedBirthday, upgradedHouse);
        return person;
    }

    asDTO(): Person {
        return (({ surrogateKey, naturalKey, name, birthday, house }) =>
            ({ surrogateKey, naturalKey, name, birthday, house }))(this);
    }
    static leafReplacer(key: string, value: any) {
        if (key === 'house') {
            return value.naturalKey;
        }
        return value;
    }
}


type DraftHouse = {
    surrogateKey?: ID; // not typically available in first data retrieved
    naturalKey: string;
    address: string;
    phone?: string;
    owner?: DraftPerson;
}
function startHouse(address: string, phone?: string, owner?: Person): DraftHouse {
    let naturalKey = address.toLowerCase().replace(/ /g, "-");
    return { naturalKey, address, phone, owner };
}
interface House extends DraftHouse {
    surrogateKey: ID; // now required
    owner?: Person; // now a person but still optional
}
class HouseImpl implements House {
    naturalKey: string;
    constructor(public surrogateKey: ID, public address: string, public phone?: string, public owner?: Person) {
        Object.assign(this, { surrogateKey, address, phone, owner });
        this.naturalKey = makeNaturalKey(this.address);
    }
    static makeHouse(draft: DraftHouse, owner?: Person): HouseImpl {
        let { surrogateKey, address, phone } = draft;
        if (!surrogateKey) throw new Error("surrogateKey is required");
        let house = new HouseImpl(surrogateKey, address, validateFormatPhone(phone as string));
        return house;
    }
    asDTO(): House {
        return (({ surrogateKey, naturalKey, address, phone, owner }) =>
            ({ surrogateKey, naturalKey, address, phone, owner }))(this);
    }
    static leafReplacer(key: string, value: any) {
        if (key === 'owner') {
            return value.naturalKey;
        }
        return value;
    }
}

// TODO next add Date replacer for birthday

// creating start* objects requires only the barest minimum of data
let person = startPerson("Bob Marley", "1978-03-05", startHouse("5120 Windsor St"));
console.log("DraftPerson initial:\n", JSON.stringify(person, null, 2), "\n");

// other fields can be added over time as they are extracted from other sources
person.surrogateKey = "1234";
(person.house as DraftHouse).phone = "604-327-9841";
(person.house as DraftHouse).surrogateKey = "5678";
console.log("DraftPerson ready:\n", JSON.stringify(person, null, 2), "\n");

let person2 = PersonImpl.makePerson(person);
console.log("PersonImpl:\n", JSON.stringify(person2, HouseImpl.leafReplacer, 2), "\n");
console.log("HouseImpl:\n", JSON.stringify(person2.house, PersonImpl.leafReplacer, 2), "\n");

let person3 = person2.asDTO();
console.log("Person DTO:\n", JSON.stringify(person3, HouseImpl.leafReplacer, 2), "\n");

