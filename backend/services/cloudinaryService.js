const fs = require("fs/promises");
const { v2: cloudinary } = require("cloudinary");

const hasCloudinaryConfig = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

if (hasCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadTaskImage = async (filePath) => {
  if (!hasCloudinaryConfig()) {
    throw new Error("Cloudinary no configurado");
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "construct-plus/tareas",
      resource_type: "image",
    });

    return result.secure_url;
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
};

module.exports = {
  hasCloudinaryConfig,
  uploadTaskImage,
};
