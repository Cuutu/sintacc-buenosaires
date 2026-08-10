// Pegá esto en Atlas → Database → Browse Collections → "..." → Open MongoDB Shell
// o Atlas → Data Explorer → Open Shell (mongosh)
//
// Backfill aditivo: listas sin visibility → PUBLIC
// No borra nada. No toca PRIVATE_LINK.

use("TU_DATABASE"); // <-- reemplazá si tu DB no es la default del cluster

const resultMissing = db.lists.updateMany(
  {
    $or: [
      { visibility: { $exists: false } },
      { visibility: null },
    ],
  },
  {
    $set: {
      visibility: "PUBLIC",
      isPublic: true,
    },
  }
);

const resultPublic = db.lists.updateMany(
  { visibility: "PUBLIC", isPublic: { $ne: true } },
  { $set: { isPublic: true } }
);

const resultPrivate = db.lists.updateMany(
  { visibility: "PRIVATE_LINK", isPublic: { $ne: false } },
  { $set: { isPublic: false } }
);

print("Sin visibility → PUBLIC:", resultMissing.modifiedCount);
print("PUBLIC sync isPublic:", resultPublic.modifiedCount);
print("PRIVATE_LINK sync isPublic:", resultPrivate.modifiedCount);
print("Listo.");
