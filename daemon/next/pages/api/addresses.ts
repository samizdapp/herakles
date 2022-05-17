// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'

const time = (_req: NextApiRequest, res: NextApiResponse) => {
    const fs = require('fs')
    try {
        const addresses = JSON.parse(fs.readFileSync('./service/roamer/addresses').toString('utf-8').trim())
        res.status(200).json({ addresses })
    } catch (e) {
        res.status(200).json({ addresses: [] })
    }
}

export default time