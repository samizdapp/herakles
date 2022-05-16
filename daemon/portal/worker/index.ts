import localforage from "localforage";

export { }
declare const self: ServiceWorkerGlobalScope

// To disable all workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true
// https://developers.google.com/web/tools/workbox/guides/configure-workbox#disable_logging
//
// self.__WB_DISABLE_DEV_LOGS = true

// listen to message event from window
self.addEventListener('message', (event: any) => {
    // HOW TO TEST THIS?
    // Run this in your browser console:
    //     window.navigator.serviceWorker.controller.postMessage({command: 'log', message: 'hello world'})
    // OR use next-pwa injected workbox object
    //     window.workbox.messageSW({command: 'log', message: 'hello world'})
    console.log(event?.data);
});

self.addEventListener('push', (event: any) => {
    const data = JSON.parse(event?.data.text() || '{}')
    event?.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.message,
            icon: '/icons/android-chrome-192x192.png'
        })
    )
})

interface AddressesResponse {
    addresses: Array<string>,
    index: number
}


const broadcast = new BroadcastChannel('address-channel');

async function getAddress(event: any): Promise<string> {
    const { hostname } = new URL(event.request.url)
    const bootstrap = hostname.endsWith('localhost') ? ['192.168.42.1', '127.0.0.1'] : [hostname]
    let addresses: Array<string> = (await localforage.getItem('addresses')) || bootstrap

    // do {
    broadcast.postMessage({
        type: 'TRY_ADDRESSES',
        nonce: Date.now(),
        addresses
    })
    const returned: AddressesResponse = await Promise.race(addresses.map((addr, i) => {

        return fetch(`http://${addr}/api/addresses`, { referrerPolicy: "unsafe-url" }).then(r => {
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
            return new Promise(r => setTimeout(r, 100000))
        })
    }))
    if (!returned) {
        return getAddress(event)
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

async function maybeRedirectFetch(event: any) {
    const address = await getAddress(event)
    const request = event.request
    const { hostname, pathname, searchParams } = new URL(event.request.url)


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
        body
    }




    const url = `http://${address}${pathname}${searchParams ? `?${searchParams}` : ''}`

    console.log(url, args, event.request)
    return fetch(url, args)
}

function shouldHandle(event: any) {
    const { hostname } = new URL(event.request.url)

    return hostname.endsWith(self.location.hostname)
}

self.addEventListener('fetch', async function (event: any) {
    try {
        broadcast.postMessage({
            type: 'TRIED_ADDRESS',
            nonce: Date.now(),
            addr: event.request.url
        });

        if (shouldHandle(event)) {
            // const url = `http://${preferredAddress}/${path}`
            // console.log('redirect to address', preferredAddress)
            event.respondWith(maybeRedirectFetch(event));
        }
    } catch (e) {
        console.error(e)
    }
});

self.addEventListener('notificationclick', (event: any) => {
    event?.notification.close()
    event?.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList: any) {
            if (clientList.length > 0) {
                let client = clientList[0]
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i]
                    }
                }
                return client.focus()
            }
            return self.clients.openWindow('/')
        })
    )
})