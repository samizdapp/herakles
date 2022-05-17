// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'

const harnessed = (_req: NextApiRequest, res: NextApiResponse) => {
    const fs = require('fs')
    try {
        const harnessed = fs.readdirSync('./harness').map((dir: string) => dir.replace(/^\/|\/$/g, ''))
        res.status(200).json({ harnessed })
    } catch (e) {
        res.status(200).json({ harnessed: [] })
    }
}

export default harnessed