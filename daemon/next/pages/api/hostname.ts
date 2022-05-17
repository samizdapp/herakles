// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'

const time = (req: NextApiRequest, res: NextApiResponse) => {
    const fs = require('fs')
    try {
        fs.writeFileSync('./service/hostname/update', req.body.hostname)
        res.status(200).json({})
    } catch (e: any) {
        res.status(200).json({ error: e.message })
    }
}

export default time