import { Router } from 'itty-router'

const router = Router()

const neo4jRequestOptions = ({ statement, parameters }) => {
    var headers = new Headers()
    headers.append('Accept', 'application/json')
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', NEO4J_AUTH)

    // Use this header for Jolt (JSON + Bolt)
    //headers.append("Accept", "application/vnd.neo4j.jolt+json-seq");

    var requestOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify({ statements: [{ statement, parameters }] }),
        redirect: 'follow',
    }

    return requestOptions
}

/*
Our index route, find the Geo closest to the user and associated news articles.
*/
router.get('/', async (req, res) => {
    //console.log(JSON.stringify(req, undefined, 2))

    const location = {
        latitude: req.cf.latitude || 0.0,
        longitude: req.cf.longitude || 0.0,
    }

    const statement = `
    MATCH (g:Geo) 
    WITH 
      distance(
        g.location, 
        point({latitude: toFloat($location.latitude), longitude: toFloat($location.longitude)})
      ) AS dist, g
    ORDER BY dist ASC LIMIT 10
    MATCH (a:Article)-[:ABOUT_GEO]->(g) WITH DISTINCT a ORDER BY a.published DESC
    WITH COLLECT(
      a {.*, articleId: id(a),
        geos: [(a)-[:ABOUT_GEO]->(g:Geo) | g.name],  
        topics: [(a)-[:HAS_TOPIC]->(t:Topic) | t.name], 
        orgs: [(a)-[:ABOUT_ORGANIZATION]->(o:Organization) | o.name], 
        people: [(a)-[:ABOUT_PERSON]->(p:Person) | p.name], 
        photos: [(a)-[:HAS_PHOTO]->(p:Photo) | {caption: p.caption, url: p.url}]
      }) AS data
    RETURN data`

    var parameters = { location }

    const response = await fetch(
        NEO4J_HTTP_URI,
        neo4jRequestOptions({ statement, parameters })
    )
    const result = await response.json()

    return new Response(JSON.stringify(result.results[0].data[0].row[0]), {
        status: 200,
        headers: { 'content-type': 'application/json;charset=UTF-8' },
    })
})

/*
Given an articleId, find similar articles.
*/
router.get('/recommended/:id', async ({ params }) => {
    const articleId = decodeURIComponent(params.id)

    const statement = `
    MATCH (this:Article) WHERE id(this) = toInteger($article.id)
    MATCH (this)-[:HAS_TOPIC|:ABOUT_GEO|:ABOUT_ORGANIZATION|:ABOUT_PERSON]->(t)
    WITH * ORDER BY id(t)
    WITH this, COLLECT(id(t)) AS t1
    MATCH (a:Article)-[:HAS_TOPIC|:ABOUT_GEO|:ABOUT_ORGANIZATION|:ABOUT_PERSON]->(t) WHERE a <> this
    WITH * ORDER BY id(t)
    WITH this, a, t1, COLLECT(id(t)) AS t2
    WITH a, gds.alpha.similarity.jaccard(t1, t2) AS jaccard
    ORDER BY jaccard DESC LIMIT 10
    RETURN COLLECT(a{.*, articleId: id(a),
      geos: [(a)-[:ABOUT_GEO]->(g:Geo) | g.name],  
      topics: [(a)-[:HAS_TOPIC]->(t:Topic) | t.name], 
      orgs: [(a)-[:ABOUT_ORGANIZATION]->(o:Organization) | o.name], 
      people: [(a)-[:ABOUT_PERSON]->(p:Person) | p.name], 
      photos: [(a)-[:HAS_PHOTO]->(p:Photo) | {caption: p.caption, url: p.url}]  
      }) AS data`

    var parameters = { article: { id: articleId } }

    const response = await fetch(
        NEO4J_HTTP_URI,
        neo4jRequestOptions({ statement, parameters })
    )
    const result = await response.json()

    return new Response(JSON.stringify(result.results[0].data[0].row[0]), {
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
