import styles from '../styles/Home.module.css'
import  useSwr from 'swr'
import { useEffect, useState } from 'react'

const fetcher = (...args : [any] ) => fetch(...args).then(res => res.json())


export default function Home() {
    const  {data: time, error : timeError} = useSwr('/api/time', fetcher, {refreshInterval: 1000})
    const { data: addresses, error: addressError} = useSwr('/api/addresses', fetcher, { refreshInterval: 2000 })
    const [tried, setTried] = useState('')
    const [preferred, setPreferred] = useState('')
    const [log, setLog] = useState([''])
    

    useEffect(() => {
        const broadcast = new BroadcastChannel('address-channel');
        broadcast.onmessage = event => {
            if (event.data.type === "TRY_ADDRESSES") {
                setTried(JSON.stringify(event.data, null, 2))
            } else if (event.data.type === "PREFERRED_ADDRESS") {
                setPreferred(event.data.preferred)
            } else if (event.data.type === "TRIED_ADDRESS") {
                const msg = `${event.data.nonce} tried address ${event.data.addr}`
                setLog([msg].concat(log))
            } else if (event.data.type === "TRIED_ADDRESS_ERROR") {
                const msg = `${event.data.nonce} error on address ${event.data.addr}: ${event.data.error}`
                setLog([msg].concat(log))
            }
        }
        return () => broadcast.close()
    }, [log])
    const d = new Date(time?.time || undefined)
    const clock = `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    const connection = `${preferred.indexOf('sam') === 0 ? 'Wifi Access Point' : preferred.indexOf('192') === 0 ? 'LAN' : 'WAN'}`
    
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Herakles
        </h1>

        <p className={styles.description}>
          {timeError ? timeError.toString() : clock}
        </p>
        <p>
            Connected via {connection}: {preferred}
        </p>
        <pre className={styles.description}>
          {addressError ? addressError.toString() : JSON.stringify(addresses?.addresses, null, 2)}
        </pre>
        <pre className={styles.description}>
          {preferred}
        </pre>
        <pre className={styles.description}>
          {tried}
        </pre>
        <pre className={styles.description}>
          {log.join('\n')}
        </pre>
    </main> 
    </div>
  )
}
