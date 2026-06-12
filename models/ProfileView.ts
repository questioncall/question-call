import { Schema, model, models } from "mongoose";

// Tracks who viewed whose profile. One record per (viewer, viewed) pair.
// TTL index auto-expires records after 3 days — matching the TikTok-style
// "who viewed your profile in the last 3 days" window.
const profileViewSchema = new Schema({
  viewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  viewedId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  viewedAt: { type: Date, default: Date.now },
});

// One record per viewer+viewed pair — upserted on each new view
profileViewSchema.index({ viewerId: 1, viewedId: 1 }, { unique: true });

// Auto-expire after 3 days (259200 seconds)
profileViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 259200 });

const ProfileView = models.ProfileView || model("ProfileView", profileViewSchema);
export default ProfileView;
