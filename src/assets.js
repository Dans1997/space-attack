export async function loadAssets(config) {
  const images = {};
  await Promise.all(Object.entries(config.assets.images).map(async ([id, asset]) => {
    try {
      const img = new Image();
      img.src = asset.path;
      await img.decode();
      images[id] = img;
    } catch (error) {
      if (asset.required) throw new Error(`Failed to load ${asset.path}`, { cause: error });
    }
  }));
  return { images };
}
