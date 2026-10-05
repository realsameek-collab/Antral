import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../models/user.model.js";

const isDateOfBirth = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
};

const authenticate = async (req, res) => {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer (.+)$/i);
  if (!match) {
    res.status(401).json({ message: "Please sign in again to continue." });
    return null;
  }

  try {
    return await getAuth(app).verifyIdToken(match[1]);
  } catch (error) {
    if (["auth/argument-error", "auth/id-token-expired", "auth/invalid-id-token"].includes(error.code)) {
      res.status(401).json({ message: "Your session has expired. Please sign in again." });
      return null;
    }
    throw error;
  }
};

export const getProfile = async (req, res) => {
  const identity = await authenticate(req, res);
  if (!identity) return;

  const user = await User.findOne({ firebaseUid: identity.uid })
    .select("firstName lastName dateOfBirth")
    .lean();

  if (!user?.firstName || !isDateOfBirth(user.dateOfBirth)) {
    return res.json({ profile: null });
  }

  return res.json({
    profile: {
      firstName: user.firstName,
      lastName: user.lastName || "",
      dateOfBirth: user.dateOfBirth,
    },
  });
};

export const saveProfile = async (req, res) => {
  const identity = await authenticate(req, res);
  if (!identity) return;

  const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
  const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
  const dateOfBirth = req.body?.dateOfBirth;

  if (req.body?.lastName != null && typeof req.body.lastName !== "string") {
    return res.status(400).json({ message: "Enter a valid last name or leave it blank." });
  }
  if (!firstName || firstName.length > 80) {
    return res.status(400).json({ message: "Enter a first name of 1 to 80 characters." });
  }
  if (lastName.length > 80) {
    return res.status(400).json({ message: "Last name must be 80 characters or fewer." });
  }
  if (!isDateOfBirth(dateOfBirth)) {
    return res.status(400).json({ message: "Enter a valid date of birth that is not in the future." });
  }
  if (typeof identity.email !== "string" || !identity.email) {
    return res.status(400).json({ message: "Your account needs an email address to continue." });
  }

  const name = [firstName, lastName].filter(Boolean).join(" ");
  const provider = identity.firebase?.sign_in_provider;
  const normalizedProvider =
    provider === "google.com" ? "google" : provider === "github.com" ? "github" : "email";

  await User.findOneAndUpdate(
    { firebaseUid: identity.uid },
    {
      $set: {
        firstName,
        lastName,
        dateOfBirth,
        name,
        email: identity.email,
        provider: normalizedProvider,
      },
      $setOnInsert: {
        firebaseUid: identity.uid,
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return res.json({ profile: { firstName, lastName, dateOfBirth } });
};
