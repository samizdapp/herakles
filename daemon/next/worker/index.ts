import localforage from "localforage";

export { }
declare const self: ServiceWorkerGlobalScope

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

const _fetch = self.fetch

interface AddressesResponse {
    addresses: Array<string>,
    index: number
}


const broadcast = new BroadcastChannel('address-channel');

async function getAddress(request: any): Promise<string> {
    const { hostname } = new URL(request.url)
    const bootstrap = hostname.endsWith('localhost') ? ['192.168.42.1', '127.0.0.1'] : [hostname]
    let addresses: Array<string> = (await localforage.getItem('addresses')) || bootstrap

    // do {
    broadcast.postMessage({
        type: 'TRY_ADDRESSES',
        nonce: Date.now(),
        addresses
    })
    const returned: AddressesResponse = await Promise.race(addresses.map((addr, i) => {

        return _fetch(`http://${addr}/api/addresses`, { referrerPolicy: "unsafe-url" }).then(r => {
            broadcast.postMessage({
                type: 'TRIED_ADDRESS',
                nonce: Date.now(),
                addr
            });
            if (!r.ok) throw new Error()
            return r.json()
        }).then(json => {
            return ({
                ...json,
                index: i
            })
        }).catch((e) => {
            broadcast.postMessage({
                type: 'TRIED_ADDRESS_ERROR',
                nonce: Date.now(),
                addr,
                error: e.toString()
            });
            return new Promise(r => setTimeout(r, 1000))
        })
    }))
    if (!returned) {
        return getAddress(request)
    }
    const preferred = addresses[returned?.index || 0]
    broadcast.postMessage({
        type: 'PREFERRED_ADDRESS',
        nonce: Date.now(),
        addresses,
        preferred
    });
    // console.log('got addresses, good index:', returned.index)
    addresses = returned?.addresses ? bootstrap.concat(returned.addresses).map(s => s.trim()) : addresses
    await localforage.setItem('addresses', addresses)
    return preferred === 'localhost' ? '127.0.0.1' : preferred
    // } while (true)
}

function shouldHandle(request: any) {
    const { hostname } = new URL(request.url)

    return hostname.endsWith(self.location.hostname) && request.url !== `http://${self.location.hostname}/`
}

async function maybeRedirectFetch(request: any, options: object) {
    if (!shouldHandle(request)) {
        return _fetch(request, options)
    }
    const address = await getAddress(request)
    const { hostname, pathname, searchParams } = new URL(request.url)
    const _headers = request.headers
    const mode = request.mode
    const method = request.method
    const keepalive = request.keepalive
    const redirect = request.redirect
    const referrer = request.referrer
    const referrerPolicy = request.referrerPolicy
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.blob()

    const headerMap = new Map()
    const [subdomain] = hostname.split('.')

    headerMap.set("X-Intercepted-Subdomain", subdomain)

    for (const [key, value] of _headers) {
        headerMap.set(key, value)
    }

    const headers = Object.fromEntries(headerMap)

    const args = {
        headers,
        mode: mode === 'navigate' ? undefined : mode,
        method,
        keepalive,
        redirect,
        referrer,
        referrerPolicy,
        body,
        ...options
    }

    const url = `http://${address}${pathname}${searchParams ? `?${searchParams}` : ''}`

    return _fetch(url, args)
}

self.fetch = maybeRedirectFetch
