// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next'

const time = (_req: NextApiRequest, res: NextApiResponse) => {
    res.status(200).json({ time: Date.now() })
}

export default time