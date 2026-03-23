import mongoose from 'mongoose';

const ApplicationMessageSchema = new mongoose.Schema(
  {
    fromUserId: { type: String, required: true },
    body: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AthleteSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    sport: { type: String, default: '' },
    school: { type: String, default: '' },
    image: { type: String, default: '' },
    followers: { type: String, default: '—' },
    engagement: { type: String, default: '—' },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    campaignId: { type: String, required: true, index: true },
    athleteUserId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'approved', 'declined'],
      default: 'pending',
    },
    pitch: { type: String, default: '' },
    athleteSnapshot: { type: AthleteSnapshotSchema, default: () => ({}) },
    messages: { type: [ApplicationMessageSchema], default: [] },
  },
  { timestamps: true }
);

ApplicationSchema.index({ campaignId: 1, athleteUserId: 1 }, { unique: true });

export type IApplication = mongoose.InferSchemaType<typeof ApplicationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
