import mongoose, { Model, Schema, model } from "mongoose";

export type KitGenerationStatus = "pending" | "running" | "completed" | "failed";

export interface KitDocument {
  ownerExternalId: string;
  jobDescription: string;
  companyUrl: string;
  requestedDays: number;
  status: KitGenerationStatus;
  kit: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const kitSchema = new Schema<KitDocument>(
  {
    ownerExternalId: { type: String, required: true, index: true },
    jobDescription: { type: String, required: true },
    companyUrl: { type: String, required: true },
    requestedDays: { type: Number, required: true, min: 1, max: 60 },
    status: { type: String, enum: ["pending", "running", "completed", "failed"], required: true },
    kit: { type: Schema.Types.Mixed, default: null },
    error: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

kitSchema.index({ ownerExternalId: 1, status: 1, jobDescription: 1, companyUrl: 1 });

export const Kit = (mongoose.models.Kit as Model<KitDocument> | undefined) ?? model<KitDocument>("Kit", kitSchema);