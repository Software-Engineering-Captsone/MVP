import mongoose from 'mongoose';

/** Stored campaign document (persisted to local JSON or Mongo later). */
const CampaignSchema = new mongoose.Schema(
  {
    brandUserId: { type: String, required: true, index: true },
    brandDisplayName: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    packageName: { type: String, default: '' },
    packageId: { type: String, default: '' },
    goal: { type: String, default: '' },
    brief: { type: String, default: '' },
    budget: { type: String, default: '' },
    duration: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' },
    acceptApplications: { type: Boolean, default: true },
    sport: { type: String, default: 'All Sports' },
    genderFilter: { type: String, default: 'Any' },
    followerMin: { type: Number, default: 0 },
    packageDetails: { type: [String], default: [] },
    platforms: { type: [String], default: [] },
    image: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'Draft',
        'Ready to Launch',
        'Open for Applications',
        'Reviewing Candidates',
        'Deal Creation in Progress',
        'Active',
        'Completed',
      ],
      default: 'Open for Applications',
    },
  },
  { timestamps: true }
);

export type ICampaign = mongoose.InferSchemaType<typeof CampaignSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
