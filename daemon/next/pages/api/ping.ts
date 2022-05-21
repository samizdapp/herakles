// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from "next";

const ping = (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ pong: Date.now() });
};

export default ping;
