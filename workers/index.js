import { Router } from 'itty-router'

const router = Router()

const neo4jRequestOptions = ({ statement, parameters }) => {
    var headers = new Headers()
    headers.append('Accept', 'application/json')
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', NEO4J_AUTH)

    var requestOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify({ statements: [{ statement, parameters }] }),
        redirect: 'follow',
    }

    return requestOptions
}

/*
Our index route, a simple hello world to run a query against Neo4j and return result JSON.
*/
router.get('/', async (req, res) => {
    console.log(JSON.stringify(req, undefined, 2))

    const location = {
        latitude: req.cf.latitude || 0.0,
        longitude: req.cf.longitude || 0.0,
    }

    const statement = `
    MATCH (g:Geo) 
    WITH 
      distance(g.location, point({latitude: toFloat($location.latitude), longitude: toFloat($location.longitude)})) AS dist, g
    ORDER BY dist ASC LIMIT 10
    MATCH (a:Article)-[:ABOUT_GEO]->(g) WITH DISTINCT a
    RETURN 
      a {.*, 
        geos: [(a)-[:ABOUT_GEO]->(g:Geo) | g.name],  
        topics: [(a)-[:HAS_TOPIC]->(t:Topic) | t.name], 
        orgs: [(a)-[:ABOUT_ORGANIZATION]->(o:Organization) | o.name], 
        people: [(a)-[:ABOUT_PERSON]->(p:Person) | p.name], 
        photos: [(a)-[:HAS_PHOTO]->(p:Photo) | {caption: p.caption, url: p.url}]
      } AS data 
    ORDER BY a.published DESC`

    var parameters = { location }

    const response = await fetch(
        NEO4J_HTTP_URI,
        neo4jRequestOptions({ statement, parameters })
    )
    const result = await response.json()

    return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json;charset=UTF-8' },
    })
})

/*
This route demonstrates path parameters, allowing you to extract fragments from the request
URL.

Try visit /example/hello and see the response.
*/
router.get('/recommended/:id', async ({ params }) => {
    let articleId = decodeURIComponent(params.id)

    // FIXME: don't use node id
    // TODO: use content based recommendation query
    const statement = `
    MATCH (a:Article) WHERE id(a) = toInteger($article.id)
    RETURN 
      a {.*, 
        geos: [(a)-[:ABOUT_GEO]->(g:Geo) | g.name],  
        topics: [(a)-[:HAS_TOPIC]->(t:Topic) | t.name], 
        orgs: [(a)-[:ABOUT_ORGANIZATION]->(o:Organization) | o.name], 
        people: [(a)-[:ABOUT_PERSON]->(p:Person) | p.name], 
        photos: [(a)-[:HAS_PHOTO]->(p:Photo) | {caption: p.caption, url: p.url}]
      } AS data 
    ORDER BY a.published DESC`

    var parameters = { article: { id: articleId } }

    const response = await fetch(
        NEO4J_HTTP_URI,
        neo4jRequestOptions({ statement, parameters })
    )
    const result = await response.json()

    return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json;charset=UTF-8' },
    })
})

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }))

/*
This snippet ties our worker to the router we defined above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', e => {
    e.respondWith(router.handle(e.request))
})
