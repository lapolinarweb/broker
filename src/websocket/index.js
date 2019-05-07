const ws = require('ws')

const MissingConfigError = require('../errors/MissingConfigError')
const adapterRegistry = require('../adapterRegistry')
const WebsocketServer = require('./WebsocketServer')

adapterRegistry.register('ws', ({ port }, {
    networkNode,
    publisher,
    storage,
    streamFetcher,
    volumeLogger,
}) => {
    if (port === undefined) {
        throw new MissingConfigError('port')
    }
    const websocketServer = new WebsocketServer(
        new ws.Server({
            port,
            path: '/api/v1/ws',
            /**
             * Gracefully reject clients sending invalid headers. Without this change, the connection gets abruptly closed,
             * which makes load balancers such as nginx think the node is not healthy.
             * This blocks ill-behaving clients sending invalid headers, as well as very old websocket implementations
             * using draft 00 protocol version (https://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-00)
             */
            verifyClient: (info, cb) => {
                if (info.req.headers['sec-websocket-key']) {
                    cb(true)
                } else {
                    cb(false, 400, 'Invalid headers on websocket request. Please upgrade your browser or websocket library!')
                }
            },
        }).on('listening', () => console.info(`WS adapter listening on ${port}`)),
        networkNode,
        storage,
        streamFetcher,
        publisher,
        volumeLogger,
    )
    return () => websocketServer.close()
})