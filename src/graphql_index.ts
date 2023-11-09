import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Legislator {
    id: String!
    firstName: String!
    lastName: String!
    fromDate: String
    toDate: String
    isCurrent: Boolean
    email: String
    urls: [String] # TODO is there a URL type?
    addresses: [TypedAddress!]!
  }

  type TypedAddress {
    type: String!
    physical: [String]! # TODO should this be broken down into lines or postal code?
    phone: String!
    fax: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
  }
`;