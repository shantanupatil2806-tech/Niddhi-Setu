const mongoose = require('mongoose');
const { INSTITUTION_TYPES, INSTITUTION_STATUS } = require('../config/constants');

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Institution code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(INSTITUTION_TYPES),
      required: [true, 'Institution type is required']
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' }
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: Object.values(INSTITUTION_STATUS),
      default: INSTITUTION_STATUS.ACTIVE
    },
    approvalDate: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

institutionSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Institution', institutionSchema);
