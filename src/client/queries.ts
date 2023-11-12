import { Client, cacheExchange, fetchExchange } from '@urql/core';

const client = new Client({
    url: 'http://localhost:4000/',
    exchanges: [cacheExchange, fetchExchange],
});

const QUERY = `
  query FindLegislators($filter: String!) {
    legislators(filter: $filter, count: 10) {
      id
      lastName
      firstName
    }
  }
`;
const result = client.readQuery(QUERY, { filter: 'peter' });
if (result) console.log(result.hasNext);


/*
query GetById($legislatorId: String!) {
    legislator(id: $legislatorId) {
      lastName
      addresses {
        phone
        physical
      }
    }
  }

  query LookupByName {
  legislators (filter: "peter", count:3) {
    id
    firstName
    lastName
  }
}

*/