import { ApolloServer, ApolloServerPlugin, BaseContext, GraphQLRequestContext, GraphQLRequestListener } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { Government } from './models';
import { LegislatorData, ConstituencyData } from './types';

const government: Government = require("../../data/ca-federal-government.json");
const legislators: Array<LegislatorData> = government.legislators;
const constituencies: Array<ConstituencyData> = government.constituencies;

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  type Legislator {
    id: String!
    nameId: String!
    firstName: String!
    lastName: String!
    honorific: String
    party: String!
    fromDate: String!
    toDate: String
    isCurrent: Boolean!
    email: String
    urls: [String] # TODO later is there a URL type?
    addresses: [TypedAddress!]!
    constituencyNameId: String!  }

  type Constituency {
    id: String!
    name: String!
    country: String!
    region: String!
    municipality: String
    legislatorNameId: String
  }

  type TypedAddress {
    type: String!
    physical: String # TODO later should this be broken down into lines or postal code?
    phone: String!
    fax: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    legislators(filter: String, start: Int, count: Int): [Legislator]
    legislator(id: String!): Legislator
  }
`;

const resolvers = {
  Query: {
    legislators: function (parent: any, args: any, contextValue: any, info: any): Array<LegislatorData> {
      // filter if requested
      let results = (args.filter) ? legislators.filter((l: LegislatorData) => l.nameId.includes(args.filter.toLowerCase())) : legislators;
      // page if requested
      args.start = args.start || 0;
      return args.count ? results.slice(args.start, args.start + args.count) : results;
    },
    legislator: (parent: any, args: any, contextValue: any, info: any) => legislators.find((l: LegislatorData) => l.id === args.id)
  },
};

async function startServer(typeDefs: any, resolvers: any) {
  let url: string = "none";

  try {

    // The ApolloServer constructor requires two parameters: your schema
    // definition and your set of resolvers.
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Passing an ApolloServer instance to the `startStandaloneServer` function:
    //  1. creates an Express app
    //  2. installs your ApolloServer instance as middleware
    //  3. prepares your app to handle incoming requests
    const result = await startStandaloneServer(server, {
      listen: { port: 4000 },
    });
    url = result.url;
  } catch (e) {
    console.error(e);
  }

  return url;
}

startServer(typeDefs, resolvers)
  .then(url => {
    console.log(`🚀  Server ready at: ${url}`);
    setTimeout(() => { console.log("done") }, 1000000);
  })
  .catch(err => {
    // Deal with the fact the chain failed
  });