import { Router, Request, Response } from "express";
import { authMiddleware } from "./utils.js";
import {
  legacyCompose,
  getRevisionFromDistrictID,
  getRevisionFileText,
} from "./service.js";

const IDEFIX_BANID_DISTRICS =
  process.env.IDEFIX_BANID_DISTRICS?.split(",") || [];

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
      const { districtID } = req.params;

      if (!IDEFIX_BANID_DISTRICS.includes(districtID)) {
        await legacyCompose(districtID);
        console.log("Legacy compose done");
      } else {
        const revision = await getRevisionFromDistrictID(districtID);
        const revisionFileText = await getRevisionFileText(revision._id);
        console.log(revisionFileText);
        // DO SOMETHING WITH THE TEXT
      }

      response = {
        date: new Date(),
        status: "success",
        response: {},
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
