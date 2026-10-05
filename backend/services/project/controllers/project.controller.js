import mongoose from "mongoose";
import Project from "../models/project.model.js";

const getUserId = (req, res) => {
  const userId = req.user?.id;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    res.status(401).json({
      success: false,
      message: "Please sign in to manage projects.",
    });
    return null;
  }

  return userId;
};

const isValidText = (value, maxLength, { allowEmpty = false } = {}) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (allowEmpty || trimmed.length > 0) && trimmed.length <= maxLength;
};

const isValidProjectId = (id) => mongoose.isValidObjectId(id);

const respondWithError = (res, operation, error) => {
  console.error(`${operation} error:`, error);
  return res.status(500).json({
    success: false,
    message: `Failed to ${operation.toLowerCase()}. Please try again.`,
  });
};

export const createProject = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { name, description = "" } = req.body ?? {};
  if (!isValidText(name, 100)) {
    return res.status(400).json({
      success: false,
      message: "Project name is required and must be 100 characters or fewer.",
    });
  }
  if (!isValidText(description, 500, { allowEmpty: true })) {
    return res.status(400).json({
      success: false,
      message: "Project description must be 500 characters or fewer.",
    });
  }

  try {
    const project = await Project.create({
      userId,
      name: name.trim(),
      description: description.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project,
    });
  } catch (error) {
    return respondWithError(res, "Create project", error);
  }
};

export const getProjects = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    const projects = await Project.find({
      userId,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return respondWithError(res, "Fetch projects", error);
  }
};

export const getProject = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  if (!isValidProjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  try {
    const project = await Project.findOne({
      _id: id,
      userId,
      status: { $ne: "deleted" },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.status(200).json({ success: true, project });
  } catch (error) {
    return respondWithError(res, "Fetch project", error);
  }
};

export const updateProject = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  if (!isValidProjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  const { name, description } = req.body ?? {};
  if (name !== undefined && !isValidText(name, 100)) {
    return res.status(400).json({
      success: false,
      message: "Project name must be between 1 and 100 characters.",
    });
  }
  if (description !== undefined && !isValidText(description, 500, { allowEmpty: true })) {
    return res.status(400).json({
      success: false,
      message: "Project description must be 500 characters or fewer.",
    });
  }
  if (name === undefined && description === undefined) {
    return res.status(400).json({
      success: false,
      message: "Provide a project name or description to update.",
    });
  }

  try {
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    const project = await Project.findOneAndUpdate(
      { _id: id, userId, status: { $ne: "deleted" } },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (error) {
    return respondWithError(res, "Update project", error);
  }
};

export const deleteProject = async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  if (!isValidProjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid project ID." });
  }

  try {
    const project = await Project.findOneAndUpdate(
      { _id: id, userId, status: { $ne: "deleted" } },
      { $set: { status: "deleted" } },
      { new: true, runValidators: true },
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    return respondWithError(res, "Delete project", error);
  }
};
