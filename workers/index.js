import { Router } from 'itty-router'

// Create a new router
const router = Router()

/*
Our index route, a simple hello world to run a query against Neo4j and return result JSON.
*/
router.get('/', async (req, res) => {
    console.log(JSON.stringify(req, undefined, 2))

    var headers = new Headers()
    headers.append('Accept', 'application/json')
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', NEO4J_AUTH)

    const statement = `MATCH (n) RETURN {count: COUNT(n)} AS data`

    var parameters = { foo: 'bar' }

    var requestOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify({ statements: [{ statement, parameters }] }),
        redirect: 'follow',
    }

    const response = await fetch(NEO4J_HTTP_URI, requestOptions)

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
router.get('/example/:text', ({ params }) => {
    // Decode text like "Hello%20world" into "Hello world"
    let input = decodeURIComponent(params.text)

    // Construct a buffer from our input
    let buffer = Buffer.from(input, 'utf8')

    // Serialise the buffer into a base64 string
    let base64 = buffer.toString('base64')

    // Return the HTML with the string to the client
    return new Response(`<p>Base64 encoding: <code>${base64}</code></p>`, {
        headers: {
            'Content-Type': 'text/html',
        },
    })
})

/*
This shows a different HTTP method, a POST.

Try send a POST request using curl or another tool.

Try the below curl command to send JSON:

$ curl -X POST <worker> -H "Content-Type: application/json" -d '{"abc": "def"}'
*/
router.post('/post', async request => {
    // Create a base object with some fields.
    let fields = {
        asn: request.cf.asn,
        colo: request.cf.colo,
    }

    // If the POST data is JSON then attach it to our response.
    if (request.headers.get('Content-Type') === 'application/json') {
        fields['json'] = await request.json()
    }

    // Serialise the JSON to a string.
    const returnData = JSON.stringify(fields, null, 2)

    return new Response(returnData, {
        headers: {
            'Content-Type': 'application/json',
        },
    })
})

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }))

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', e => {
    e.respondWith(router.handle(e.request))
})
