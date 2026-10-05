const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 15 * 1024 * 1024;

const isImageType = (mimeType, bytes) => {
  if (mimeType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
};

export const validateAttachments = (attachments) => {
  if (attachments === undefined) return [];
  if (!Array.isArray(attachments) || attachments.length > MAX_IMAGE_COUNT) {
    const error = new Error(`Attach up to ${MAX_IMAGE_COUNT} images.`);
    error.status = 400;
    throw error;
  }

  let totalBytes = 0;
  return attachments.map((attachment) => {
    const match = typeof attachment?.dataUrl === "string"
      ? /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(attachment.dataUrl)
      : null;
    if (!match) {
      const error = new Error("Images must be PNG, JPEG, or WebP files.");
      error.status = 400;
      throw error;
    }

    const [, mimeType, base64] = match;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.toString("base64") !== base64 || !isImageType(mimeType, bytes)) {
      const error = new Error("An attached image could not be read. Try another image.");
      error.status = 400;
      throw error;
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      const error = new Error("Each image must be 5 MB or smaller.");
      error.status = 400;
      throw error;
    }

    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
      const error = new Error("Attached images must total 15 MB or less.");
      error.status = 400;
      throw error;
    }
    return { mimeType, dataUrl: attachment.dataUrl };
  });
};
