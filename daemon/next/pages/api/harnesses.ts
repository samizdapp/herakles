// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'

const harnesses = (_req: NextApiRequest, res: NextApiResponse) => {
    const fs = require('fs')
    try {
        const harnesses = fs.readdirSync('./harness').map((dir: string) => dir.replace(/^\/|\/$/g, ''))
        res.status(200).json({ harnesses })
    } catch (e) {
        res.status(200).json({ harnesses: [] })
    }
}

export default harnesses