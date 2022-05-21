// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { NextApiRequest, NextApiResponse } from 'next'

const asyncExec = async (cmd: string) => new Promise((resolve, reject) => exec(cmd, (err, res) => {
  if (err) return reject(err)
  resolve(res)
}))

const getCurrent = async () => {
  const buf = await fs.readFile('./service/hostname/current')
  return buf.toString().trim()
}

const checkUpdate = async (newHost: string, timeout = 5000) => {
  const start = Date.now()

  do {
    const buf = await getCurrent()
    const hostname = buf.toString().trim()
    console.log('compare', hostname, newHost)
    if (hostname === newHost) return true;
  } while (Date.now() < start + timeout)

  return false;
}


const hostname = async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    body,
    method
  } = req
  try {
    switch (method) {
      case 'GET':
        const hostname = await getCurrent()
        return res.status(200).json({ hostname })
      case 'PUT':
        console.log('got hostname update', body?.hostname)
        await fs.writeFile('./service/hostname/update', body.hostname)
        console.log('wrote to update file')
        const success = await checkUpdate(body.hostname)
        return res.status(success ? 200 : 500).end()
      default:
        return res.status(405).end()
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export default hostname