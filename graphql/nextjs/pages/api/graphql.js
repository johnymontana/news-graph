import { gql, ApolloServer } from "apollo-server-micro";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import neo4j from "neo4j-driver";
import { Neo4jGraphQL } from "@neo4j/graphql";

const typeDefs = gql`
  type Article @exclude(operations: [CREATE, UPDATE, DELETE]) {
    abstract: String
    published: Date
    title: String
    url: String!
    photo: Photo @relationship(type: "HAS_PHOTO", direction: OUT)
    authors: [Author] @relationship(type: "BYLINE", direction: OUT)
    topics: [Topic] @relationship(type: "HAS_TOPIC", direction: OUT)
    people: [Person] @relationship(type: "ABOUT_PERSON", direction: OUT)
    organizations: [Organization]
      @relationship(type: "ABOUT_ORGANIZATION", direction: OUT)
    geos: [Geo] @relationship(type: "ABOUT_GEO", direction: OUT)
  }

  type Author @exclude(operations: [CREATE, UPDATE, DELETE]) {
    name: String!
    articles: [Article] @relationship(type: "BYLINE", direction: IN)
  }

  type Topic @exclude(operations: [CREATE, UPDATE, DELETE]) {
    name: String!
    articles: [Article] @relationship(type: "HAS_TOPIC", direction: IN)
  }

  type Person @exclude(operations: [CREATE, UPDATE, DELETE]) {
    name: String!
    articles: [Article] @relationship(type: "ABOUT_PERSON", direction: IN)
  }

  type Organization @exclude(operations: [CREATE, UPDATE, DELETE]) {
    name: String!
    articles: [Article] @relationship(type: "ABOUT_ORGANIZATION", direction: IN)
  }

  type Geo @exclude(operations: [CREATE, UPDATE, DELETE]) {
    name: String!
    location: Point
    articles: [Article] @relationship(type: "ABOUT_GEO", direction: IN)
  }

  type Photo @exclude(operations: [CREATE, UPDATE, DELETE]) {
    caption: String
    url: String!
    article: Article @relationship(type: "HAS_PHOTO", direction: IN)
  }

  # @cypher schema directive fields

  extend type Topic {
    articleCount: Int
      @cypher(statement: "RETURN SIZE( (this)<-[:HAS_TOPIC]-(:Article) )")
  }

  #extend type Article {
  #  similar(first: Int = 3): [Article]
  #    @cypher(
  #      statement: """
  #      MATCH (this)-[:HAS_TOPIC]->(t:Topic)
  #      WITH this, COLLECT(id(t)) AS t1
  #      MATCH (a:Article)-[:HAS_TOPIC]->(t:Topic) WHERE a <> this
  #      WITH this, a, t1, COLLECT(id(t)) AS t2
  #      WITH a, gds.alpha.similarity.jaccard(t1, t2) AS jaccard
  #      ORDER BY jaccard DESC
  #      RETURN a LIMIT toInteger($first)
  #      """
  #    )
  #}

  # type Mutation {
  #   createComment(userId: ID!, text: String!, articleId: ID!): Comment
  #     @cypher(
  #       statement: """
  #       MATCH (u:User {userId: $userId})
  #       MATCH (a:Article {articleId: $articleId})
  #       CREATE (c:Comment)<-[:WROTE_COMMENT]-(u)
  #       SET c.text      = $text,
  #           c.created   = timestamp(),
  #           c.commentId = randomUUD()
  #       RETURN c
  #       """
  #     )
  # }

  type User @exclude(operations: [CREATE, UPDATE, DELETE]) {
    userId: ID!
    userName: String!
  }

  type Comment @exclude(operations: [CREATE, UPDATE, DELETE]) {
    commentId: ID! @id
    created: DateTime @timestamp
    text: String!
    article: Article @relationship(type: "HAS_COMMENT", direction: IN)
    author: User @relationship(type: "WROTE_COMMENT", direction: IN)
  }

  type Query {
    myComments: [Comment]
      @cypher(
        statement: """
        MATCH (c:Comment)<-[:WROTE_COMMENT]-(u:User {userId: $auth.jwt.sub})
        RETURN c
        """
      )
    geoSearch(latitude: Float!, longitude: Float!): [Article]
      @cypher(
        statement: """
        MATCH (g:Geo)<-[:ABOUT_GEO]-(a:Article)
        WHERE distance(g, Point({latitude: $latitude, longitude: $longitude})) < 1000
        RETURN a
        """
      )

    articleSearch(searchString: String!): [Article]
      @cypher(
        statement: """
        CALL db.index.fulltext.queryNodes('articleIndex', $searchString + '~')
        YIELD node RETURN node
        """
      )
  }

  # extend type Comment @auth(rules: [{ where: { username: "$jwt.sub" } }])

  #  extend type Person {
  #    description: String
  #      @cypher(
  #        statement: """
  #        WITH this, apoc.static.get('gcpkey') AS gcpkey,
  #          'https://kgsearch.googleapis.com/v1/entities:search?query=' AS baseURL
  #        CALL apoc.load.json(baseURL + apoc.text.urlencode(this.name) + '&limit=1&key=' + gcpkey)
  #        YIELD value
  #        RETURN value.itemListElement[0].result.detailedDescription.articleBody
  #        """
  #      )
  #  }
`;

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

const apolloServer = new ApolloServer({
  schema: neoSchema.schema,
  playground: true,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground],
});

const startServer = apolloServer.start();

export default async function handler(req, res) {
  await startServer;
  await apolloServer.createHandler({
    path: "/api/graphql",
  })(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
