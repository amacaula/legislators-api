type ID = string;

interface Person {
    key: ID;
    name: string;
    age: number;
    house: House | undefined | null;
}

interface House {
    key: ID;
    address: string;
    phone: string;
    owner: Person | null;
}

class PersonDTO implements Person {
    public key;
    constructor(public name: string, public age: number, public house: House | null) { // TODO weird publics
        this.key = name;
        this.name = name;
        this.age = age;
        this.house = house;
    }
}

class HomeDTO implements House {
    public key;
    constructor(public address: string, public phone: string, public owner: Person | null) {
        this.key = address;
        this.address = address;
        this.phone = phone;
        this.owner = owner
    }
}

class PersonDO extends PersonDTO {
    secret: String;
    constructor(public name: string, public age: number, public house: House, secret: string) {
        super(name, age, house);
        this.secret = secret;
        if (!house.owner) {
            house.owner = this;
        }
    }

    nextYear(): number {
        return this.age + 1;
    }

    // TODO replace with AutoMapper?

    asDTO(): PersonDTO {
        return (({ key, name, age, house }) => ({ key, name, age, house }))(this);
    }

    static fromDTO(dto: PersonDTO, secret: string): PersonDO {
        const { name, age, house: home } = dto;
        return new PersonDO(name, age, home as House, secret); // TODO brittle
    }
}

let p = new PersonDO("Bob", 42, new HomeDTO("5120 Windsor St", "604-327-9841", null), "mySecret");
console.log(p.nextYear());
console.log(JSON.stringify(p, null, 2));
console.log(JSON.stringify(p.asDTO(), null, 2));