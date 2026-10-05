import express from "express";

import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";

const router = express.Router();

// Create a new project
router.post("/", createProject);

// Get all projects of logged-in user
router.get("/", getProjects);

// Get a single project
router.get("/:id", getProject);

// Update a project
router.put("/:id", updateProject);

// Delete a project
router.delete("/:id", deleteProject);

export default router;