/* This is an experiment to clarify how best to use types, interfaces and classes
 * to support slack typing on "draft" types that can be used to gradually build up structured
 * data from a variety of sources and then convert to classes with supporting interfaces that
 * are exposed in APIs with clean typing, birdirectional references supporting a number of
 * serialization graphs (with JSON.stringify) and a minimum of duplicate code.
 * 
 * The bidirectionally navigable Person and House classes are the main focus of this experiment.
 * Each as a
 * - Draft<Name> type that is used to build up the data structure gradually
 * - <Name> interface that is used to expose the data structure in APIs with bidirectional references
 * - <Name>Impl class that is used to implement the interface, provide the data structure and 
 *   supporting helper functions including for validation and serialization
 */

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
    return formattedPhoneNumber;
}

// ----------------------- Person types, interfaces and class ------------------

// For building up a person data structure gradually - most fields are optional
type DraftPerson = {
    surrogateKey?: ID; // not typically available in first data retrieved
    naturalKey: string;
    name: string;
    birthday?: string | Date; // assigned as string initially
    house?: DraftHouse;
}
// End up using natural keys at the beginning based on names as they are available (but often inconsistent)
function makeNaturalKey(name: string): string {
    return name.toLowerCase().replace(/ /g, "-");
}
// Convenience function to create starter person but no class needed
// Any object with the necessary fields is welcome
function startPerson(name: string, birthday?: string | Date, house?: DraftHouse): DraftPerson {
    let naturalKey = makeNaturalKey(name);
    return { naturalKey, name, birthday, house };
}

// Tighten up constraints for the final person data structure exposed through APIs
// And use interface so can use implements below which reduces duplicate code declaring fields
// Surprised there doesn't appear to be any limitations on overrides that can be applied
interface Person extends DraftPerson {
    surrogateKey: ID; // now required
    birthday: Date; // now must be date and required
    house: House; // now a House and required
}
//
class PersonImpl implements Person {
    private _name: string;
    private _naturalKey: string;
    private _house: House;
    // Not sure why need to specify public - isnt it implied by implementing the Person interface
    constructor(public surrogateKey: ID, name: string, public birthday: Date, house: House) {
        Object.assign(this, { surrogateKey, birthday });
        this.name = name;
        this.house = house;
    }
    // ----------------------- Getters and setters ------------------
    public get house(): House {
        return this._house;
    }
    public set house(value: House) {
        this._house = value;
        this._house.owner = this;
    }
    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
        this._naturalKey = makeNaturalKey(this.name);
    }
    public get naturalKey(): string {
        return this._naturalKey;
    }

    // convert draft objects into full PersonImpl and HouseImpl objects
    // Should this function declare that it throws an error?
    static upgradePerson(draft: DraftPerson): PersonImpl {
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

    asDTO(follow: boolean = true): Person {
        let dto: any = (({ surrogateKey, naturalKey, name, birthday }) =>
            ({ surrogateKey, naturalKey, name, birthday }))(this);
        if (follow) {
            dto.house = (this.house as HouseImpl).asDTO(!follow);
        } else {
            dto.house = this.house?.naturalKey;
        }
        return dto;
    }
    toJSON() { // needed as getters and setters break JSON.stringify
        let dto = this.asDTO();
        return JSON.stringify(dto, null, 2);
    }
    static leafReplacer(key: string, value: any) {
        if (key === 'house') {
            return value.naturalKey;
        }
        return value;
    }
}

// ----------------------- House types, interfaces and class ------------------

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
    asDTO(follow: boolean = true): House {
        let dto: any = (({ surrogateKey, naturalKey, address, phone }) =>
            ({ surrogateKey, naturalKey, address, phone }))(this);
        if (follow) {
            dto.owner = (this.owner as PersonImpl).asDTO(!follow);
        } else {
            dto.owner = this.owner?.naturalKey;
        }
        return dto;
    }
    toJSON() { // needed as getters and setters break JSON.stringify
        return JSON.stringify(this.asDTO(), null, 2);
    }
    static leafReplacer(key: string, value: any) {
        if (key === 'owner') {
            return value.naturalKey;
        }
        return value;
    }
    // TODO next add Date replacer for birthday
}

// ------------------ Main test code ------------------

// creating start* objects requires only the barest minimum of data, birthday not strictly required
let house = startHouse("5120 Windsor St");
let person = startPerson("Bob Marley", "1978-03-05", house);
console.log("DraftPerson initial:\n", JSON.stringify(person, null, 2), "\n");

// other fields can be added over time as they are extracted from other sources
person.surrogateKey = "1234";
house.phone = "604-327-9841";
house.surrogateKey = "5678";
console.log("DraftPerson ready:\n", JSON.stringify(person, null, 2), "\n");

let person2 = PersonImpl.upgradePerson(person);
console.log("PersonImpl:\n", person2.toJSON(), "\n");
console.log("HouseImpl:\n", (person2.house as HouseImpl).toJSON(), "\n");


