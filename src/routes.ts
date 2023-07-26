import { Router, Request, Response } from "express";
import authMiddleware from "./middleware/auth.js";
import { getRevisionFromDistrictCOG, getRevisionFileText } from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import localCurrentDate from "./utils/local-current-date.js";
import { getDistrictFromCOG } from "./ban-api/index.js";

const router: Router = Router();

router.get("/id-fix", authMiddleware, (req: Request, res: Response) => {
  res.send("ID-Fix is live!");
});

router.get(
  "/district/cog/:cog",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      let responseBody;
      const { cog } = req.params;

      const district = await getDistrictFromCOG(cog);
      const useBanId = district?.config?.useBanId;
      if (!useBanId) {
        const message = `District cog ${cog} do not support BanID`;
        responseBody = {
          message,
        };
        console.log(`[${localCurrentDate()}] ${message}`);
        // TODO: Build Exploitation BDD (Legacy) by Legacy compose
      } else {
        const revision = await getRevisionFromDistrictCOG(cog);
        const revisionFileText = await getRevisionFileText(revision._id);
        responseBody = (await sendBalToBan(revisionFileText)) || {};
        console.log(
          `[${localCurrentDate()}] District cog ${cog} update in BAN BDD`
        );
        // TODO: Build Exploitation BDD (Legacy) from BAN BDD
      }

      response = {
        date: new Date(),
        status: "success",
        response: responseBody,
      };
    } catch (error) {
      const { message } = error as Error;
      response = {
        date: new Date(),
        status: "error",
        message,
        response: {},
      };
    }

    res.send(response);
  }
);

export default router;
