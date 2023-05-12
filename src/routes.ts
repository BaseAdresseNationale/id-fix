import { Router, Request, Response } from "express";
import authMiddleware from "./middleware/auth.js";
import { getRevisionFromDistrictID, getRevisionFileText } from "./dump-api/index.js";
import { sendBalToBan } from "./bal-converter/index.js";
import localCurrentDate from "./utils/local-current-date.js";

const IDEFIX_BANID_DISTRICTS =
  process.env.IDEFIX_BANID_DISTRICTS?.split(",").map((idDistric) =>
    idDistric.trim()
  ) || [];

const router: Router = Router();

router.get("/id-fix", authMiddleware, (req: Request, res: Response) => {
  res.send("ID-Fix is live!");
});

router.get(
  "/district/:districtID",
  authMiddleware,
  async (req: Request, res: Response) => {
    let response;
    try {
      let responseBody;
      const { districtID } = req.params;

      if (!IDEFIX_BANID_DISTRICTS.includes(districtID)) {
        const message = `District ${districtID} do not support BanID`;
        responseBody = {
          message,
        };
        console.log(`[${localCurrentDate()}] ${message}`);
        // TODO: Build Exploitation BDD (Legacy) by Legacy compose
      } else {
        const revision = await getRevisionFromDistrictID(districtID);
        const revisionFileText = await getRevisionFileText(revision._id);
        responseBody = (await sendBalToBan(revisionFileText)) || {};
        console.log(
          `[${localCurrentDate()}] District ${districtID} update in BAN BDD`
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
