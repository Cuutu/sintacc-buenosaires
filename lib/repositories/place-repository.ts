import connectDB from "@/lib/mongodb"
import { Place, IPlace } from "@/models/Place"
import mongoose from "mongoose"

export class PlaceRepository {
  async findAll(filters: {
    search?: string
    type?: string
    neighborhood?: string
    tags?: string[]
    status?: "approved" | "pending"
    page?: number
    limit?: number
  }) {
    await connectDB()

    const query: any = {}
    
    if (filters.status) {
      query.status = filters.status
    } else {
      query.status = "approved"
    }

    if (filters.search) {
      query.$text = { $search: filters.search }
    }

    if (filters.type) {
      query.type = filters.type
    }

    if (filters.neighborhood) {
      query.neighborhood = filters.neighborhood
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags }
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const places = await Place.find(query)
      .sort(filters.search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Place.countDocuments(query)

    return {
      places,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async findById(id: string): Promise<IPlace | null> {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    const place = await Place.findById(id).lean()
    return place as IPlace | null
  }

  async create(data: Partial<IPlace>): Promise<IPlace> {
    await connectDB()
    const place = new Place(data)
    await place.save()
    return place.toObject()
  }

  async update(id: string, data: Partial<IPlace>): Promise<IPlace | null> {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    const place = await Place.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).lean()

    return place as IPlace | null
  }

  async delete(id: string): Promise<boolean> {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false
    }

    const result = await Place.findByIdAndDelete(id)
    return !!result
  }
}
