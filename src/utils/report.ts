import { ProcessingResponse, Meta } from "../types/report";

export const buildPreProcessingReport = (
  preProcessingStatusKey: number,
  preProcessingMessage: string,
  preProcessingResponse: ProcessingResponse = {},
  meta?: Meta,
) => ({
  preProcessingStatusKey,
  preProcessingStatus: preProcessingStatusKey === 0 ? "success" : "error",
  preProcessingMessage,
  preProcessingResponse,
  meta,
  preProcessingDate: new Date(),
});
