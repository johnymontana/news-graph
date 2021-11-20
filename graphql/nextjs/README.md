## News Graph GraphQL With Next.js

This is a Next.js application that uses the "API Routes" feature of Next.js to create a GraphQL API of news articles using the [Neo4j GraphQL Library.](http://dev.neo4j.com/graphql)

[Live Demo: news-graph.vercel.app/api/graphql](https://news-graph.vercel.app/api/graphql)

## Setup

You'll need to set environment variables to connect to Neo4j. By default Next.js will read from `.env` files. For example:

`.env.local`
```
NEO4J_USER=neo4j
NEO4J_URI=neo4j+s://<YOUR NEO4J URI HERE>
NEO4J_PASSWORD=<YOUR NEO4J DB USER PASSWORD HERE>
DEBUG=@neo4j/graphql:*
```

## Queries

Show the most recent articles and the geos, organizations, people, and topics those articles are about.

```GraphQL
{
  articles(options: { sort: { published: DESC }, limit: 100 }) {
    title
    url
    published
    abstract
    authors {
      name
    }
    photo {
      caption
      url
    }
    geos {
      name
    }
    organizations {
      name
    }
    people {
      name
    }
    topics {
      name
    }
  }
}
```


Find the most recent news related to geographic areas near San Mateo, CA, USA.

```GraphQL
{
  geos(
    where: {
      location_LTE: {
        distance: 100000
        point: { latitude: 37.5630, longitude: -122.3255 }
      }
    }
    options: { limit: 10 }
  ) {
    name
    articles(options: { limit: 2, sort: { published: DESC } }) {
      title
      url
      published
      abstract
      topics {
        name
      }
    }
  }
}

```

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
