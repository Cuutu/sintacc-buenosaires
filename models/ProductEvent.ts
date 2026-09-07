import mongoose, { Schema, Document, Model } from "mongoose"
import { PRODUCT_EVENT_TTL_SECONDS } from "@/lib/analytics-catalog"

export interface IProductEvent extends Document {
  name: string
  distinctId: string
  ts: Date
  platform: string
  authenticated: boolean
  source: string
  medium: string
  campaign: string
  referrerHost: string
  entryPath: string
  country: string
  region: string
  city: string
  device: string
  props: Record<string, string | number | boolean>
}

const ProductEventSchema = new Schema<IProductEvent>(
  {
    name: { type: String, required: true, index: true },
    distinctId: { type: String, required: true, index: true },
    ts: { type: Date, required: true, index: true },
    platform: { type: String, default: "web" },
    authenticated: { type: Boolean, default: false },
    source: { type: String, default: "direct" },
    medium: { type: String, default: "none" },
    campaign: { type: String, default: "" },
    referrerHost: { type: String, default: "" },
    entryPath: { type: String, default: "/" },
    country: { type: String, default: "" },
    region: { type: String, default: "" },
    city: { type: String, default: "" },
    device: { type: String, default: "" },
    props: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "productevents" }
)

ProductEventSchema.index({ ts: 1 }, { expireAfterSeconds: PRODUCT_EVENT_TTL_SECONDS, name: "ts_ttl" })
ProductEventSchema.index({ name: 1, ts: -1 }, { name: "name_1_ts_-1" })
ProductEventSchema.index({ distinctId: 1, ts: -1 }, { name: "distinctId_1_ts_-1" })
ProductEventSchema.index({ name: 1, "props.placeId": 1, ts: -1 }, { name: "name_1_props.placeId_1_ts_-1" })
ProductEventSchema.index({ name: 1, "props.query": 1, ts: -1 }, { name: "name_1_props.query_1_ts_-1" })

export const ProductEvent: Model<IProductEvent> =
  mongoose.models.ProductEvent || mongoose.model<IProductEvent>("ProductEvent", ProductEventSchema)
