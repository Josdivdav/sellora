import dotenv from "dotenv";
dotenv.config();

import { db, FieldValue } from "../lib/db";

async function test() {
  console.log("=== Testing FastDB Adapter through lib/firebaseAdmin ===");

  // 1. Get users
  const usersSnap = await db.collection("users").get();
  console.log(`✓ db.collection("users").get(): found ${usersSnap.size} users, empty=${usersSnap.empty}`);
  const firstUser = usersSnap.docs[0];
  console.log(`  First user id: ${firstUser.id}, email: ${firstUser.data()?.email}`);

  // 2. Get stores
  const storesSnap = await db.collection("stores").get();
  console.log(`✓ db.collection("stores").get(): found ${storesSnap.size} stores`);
  const firstStore = storesSnap.docs[0];
  console.log(`  First store id: ${firstStore.id}, name: ${firstStore.data()?.name}, slug: ${firstStore.data()?.slug}`);

  // 3. Get products with limit
  const productsSnap = await db.collection("products").limit(5).get();
  console.log(`✓ db.collection("products").limit(5).get(): found ${productsSnap.size} products`);
  const firstProd = productsSnap.docs[0];
  console.log(`  First product id: ${firstProd.id}, title: ${firstProd.data()?.title || firstProd.data()?.name}`);

  // 4. Query with where
  const prodData = firstProd.data();
  if (prodData && prodData.slug) {
    const slugQuery = await db.collection("products").where("slug", "==", prodData.slug).limit(1).get();
    console.log(`✓ db.collection("products").where("slug", "==", "${prodData.slug}").limit(1).get(): found ${slugQuery.size}`);
  }


  // 5. Select fields (used in sitemap.ts)
  const selectSnap = await db.collection("products").select("slug", "price").limit(2).get();
  console.log(`✓ db.collection("products").select("slug", "price").limit(2).get():`, selectSnap.docs.map(d => d.data()));

  // 6. collectionGroup
  const groupSnap = await db.collectionGroup("products").limit(3).get();
  console.log(`✓ db.collectionGroup("products").limit(3).get(): found ${groupSnap.size} products`);

  // 7. Subcollection read
  const storeSubProds = await db.collection("stores").doc(firstStore.id).collection("products").get();
  console.log(`✓ db.collection("stores").doc("${firstStore.id}").collection("products").get(): found ${storeSubProds.size} products`);

  // 8. Count query
  const countSnap = await db.collection("stores").doc(firstStore.id).collection("products").count().get();
  console.log(`✓ count().get(): count=${countSnap.data().count}`);

  // 9. Batch & FieldValue transforms test (on temporary test docs)
  console.log("=== Testing WriteBatch & FieldValue transforms ===");
  const testRef = db.collection("_adapter_test").doc("batch1");
  await testRef.set({ initial: true, count: 5, tags: ["a", "b"] });

  const batch = db.batch();
  batch.update(testRef, {
    count: FieldValue.increment(3),
    tags: FieldValue.arrayUnion("c", "b"),
    newField: "hello"
  });
  await batch.commit();

  const refreshed = await testRef.get();
  console.log("✓ Refreshed doc after FieldValue transforms:", refreshed.data());
  if (refreshed.data()?.count !== 8) throw new Error("FieldValue.increment failed!");
  if (!refreshed.data()?.tags?.includes("c")) throw new Error("FieldValue.arrayUnion failed!");

  // Clean up
  await testRef.delete();
  const deletedSnap = await testRef.get();
  console.log("✓ Deleted test doc exists:", deletedSnap.exists);

  console.log("\nALL FASTDB ADAPTER TESTS PASSED SUCCESSFULLY! 🚀");
  process.exit(0);
}

test().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
