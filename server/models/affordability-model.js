
const mongoose = require('mongoose');

const affordabilityProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  buyerType: String,
  coOwnerCount: Number,

  owners: [{
    status: String,
    income: Number,
    cpf: Number,
    cash: Number
  }],

  flatType: String,
  employed12Months: Boolean,
  phgOption: String,
  loanYears: Number

}, { timestamps: true });

module.exports = mongoose.model('AffordabilityProfile', affordabilityProfileSchema);
