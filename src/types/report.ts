export type Plateform = "ban" | "legacy";

export interface ProcessingResponse {
  [key: string]: any;
}
interface Revision {
    revisionId: string;
    revisionPublishedAt: string;
}
export interface Meta {
  revision: Revision;
  targetedPlateform?: Plateform;
  cog: string;
}