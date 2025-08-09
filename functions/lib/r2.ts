export const listPhotos = async (bucket: R2Bucket) => {
  const objects = await bucket.list();
  return objects.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded?.toISOString(),
  }));
};

export const uploadPhoto = async (bucket: R2Bucket, file: File, key: string) => {
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });
};