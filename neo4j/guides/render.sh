echo "Usage: sh render.sh [publish]"
GUIDES=../../neo4j-guides

function render {
$GUIDES/run.sh index.adoc index.html +1 "$@"
}

render http://guides.neo4j.com/newsgraph
