import mongoose from "mongoose";
import { SCOPE_IDS, TARGET_TYPES, AUTHORIZATION_BASIS_IDS } from "../lib/policies.js";

// Common audit fields captured at the moment of consent, kept as proof.
const auditFields = {
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
};

// ---------------------------------------------------------------------------
// AccountConsent — one per user. Records which version of each account-level
// document (Terms, Privacy, Acceptable Use) the user has accepted.
// ---------------------------------------------------------------------------
const acceptedDocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true },
    version: { type: String, required: true },
    acceptedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const accountConsentSchema = new mongoose.Schema(
  {
    userUid: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, default: "", lowercase: true, trim: true },

    accepted: { type: [acceptedDocumentSchema], default: [] },

    status: {
      type: String,
      enum: ["active", "withdrawn"],
      default: "active",
      index: true,
    },
    withdrawnAt: { type: Date, default: null },

    // Global kill-switches: capabilities the user has turned off account-wide.
    // A disabled capability is denied everywhere, regardless of target grants,
    // and can be toggled back on at any time.
    disabledCapabilities: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every((s) => SCOPE_IDS.includes(s)),
        message: "One or more capabilities are not recognized.",
      },
    },

    ...auditFields,
  },
  { timestamps: true },
);

// Convenience: the version the user last accepted for a given document, or null.
accountConsentSchema.methods.versionOf = function versionOf(documentId) {
  const entry = this.accepted.find((a) => a.documentId === documentId);
  return entry ? entry.version : null;
};

// ---------------------------------------------------------------------------
// TargetAuthorization — one active record per (user, target). Records the
// user's attestation that they may assess a specific target and the scopes
// they granted. Expires and can be revoked.
// ---------------------------------------------------------------------------
const targetAuthorizationSchema = new mongoose.Schema(
  {
    userUid: { type: String, required: true, index: true },

    target: {
      type: {
        type: String,
        enum: TARGET_TYPES,
        required: true,
      },
      // Normalized identifier: repo URL, absolute path, hostname, or project id.
      identifier: { type: String, required: true, trim: true },
      label: { type: String, default: "", trim: true, maxlength: 200 },
    },

    attestation: {
      ownershipConfirmed: { type: Boolean, required: true },
      basis: {
        type: String,
        enum: AUTHORIZATION_BASIS_IDS,
        required: true,
      },
    },

    scopes: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every((s) => SCOPE_IDS.includes(s)),
        message: "One or more granted scopes are not recognized.",
      },
    },

    // Actions the user chose "Always allow" for on this target, e.g.
    // "edit_file" or "run_command:npm install". Matching agent actions run
    // without asking again. The user can remove any rule at any time.
    alwaysAllow: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 200,
        message: "Too many always-allow rules.",
      },
    },

    authorizationVersion: { type: String, required: true },

    status: {
      type: String,
      enum: ["active", "revoked", "expired"],
      default: "active",
      index: true,
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },

    ...auditFields,
  },
  { timestamps: true },
);

// Fast lookup of the authorization for a specific target.
targetAuthorizationSchema.index({ userUid: 1, "target.type": 1, "target.identifier": 1 });

// True when the record still grants access right now.
targetAuthorizationSchema.methods.isCurrentlyValid = function isCurrentlyValid() {
  return this.status === "active" && this.expiresAt instanceof Date && this.expiresAt > new Date();
};

export const AccountConsent = mongoose.model("AccountConsent", accountConsentSchema);
export const TargetAuthorization = mongoose.model(
  "TargetAuthorization",
  targetAuthorizationSchema,
);
