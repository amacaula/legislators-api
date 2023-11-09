import { Legislator, TypedAddress } from './types';
import { getAllLegislators } from './federal/members';

let legislators = getAllLegislators();

legislators.forEach(legislator => console.log(JSON.stringify(legislator)));