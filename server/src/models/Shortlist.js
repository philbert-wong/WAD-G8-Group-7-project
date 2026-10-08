import mongoose from 'mongoose';

// A saved (block, flat type) pair with a personal note.
// ownerId is an anonymous browser id until login (feature 11) lands; then it becomes the user id.
const shortlistSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    blockId: { type: String, required: true, ref: 'Block' },
    flatType: { type: String, required: true },
    note: { type: String, default: '', maxlength: 500, trim: true },
  },
  { versionKey: false, timestamps: true },
);

shortlistSchema.index({ ownerId: 1, blockId: 1, flatType: 1 }, { unique: true });

export const Shortlist = mongoose.model('Shortlist', shortlistSchema);
