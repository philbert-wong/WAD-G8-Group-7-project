import mongoose from 'mongoose';

// One document = one bookmarked block, with an optional note
const shortlistSchema = new mongoose.Schema(
  {
    block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', required: true },
    note: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }, // adds createdAt and updatedAt for free
);

export const Shortlist = mongoose.model('Shortlist', shortlistSchema);
