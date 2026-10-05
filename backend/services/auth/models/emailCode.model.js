import mongoose from "mongoose";

// One pending sign-in code per email. Only a hash of the code is stored.
const emailCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  codeHash: {
    type: String,
    required: true,
  },

  attempts: {
    type: Number,
    default: 0,
  },

  lastSentAt: {
    type: Date,
    required: true,
  },

  // MongoDB removes the document once this date passes.
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

const EmailCode = mongoose.model("EmailCode", emailCodeSchema);

export default EmailCode;
