import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "../src/client.js";

const databaseUrl = process.env.DATABASE_URL;

test("catalog canonical identities and USD source price snapshots are constrained and immutable", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  const rollback = new Error("ROLLBACK_CATALOG_FIXTURE");
  try {
    await assert.rejects(
      database.$transaction(async (tx) => {
        const suffix = randomUUID();
        const developer = await tx.catalogDeveloper.create({
          data: {
            source: "catalog-test",
            slug: `developer-${suffix}`,
            displayName: "Test Developer",
          },
        });
        const provider = await tx.catalogProvider.create({
          data: {
            source: "catalog-test",
            slug: `provider-${suffix}`,
            displayName: "Test Provider",
          },
        });
        const model = await tx.catalogModel.create({
          data: {
            source: "catalog-test",
            sourceModelId: `developer/model-${suffix}`,
            canonicalSlug: `developer/model-${suffix}`,
            name: "Catalog Test Model",
            inputModalities: ["text"],
            outputModalities: ["text"],
            supportedParameters: ["temperature"],
            servedEndpoints: ["/api/v1/chat/completions"],
            rawMetadata: { test_fixture: true },
            isActive: true,
            lastSeenAt: new Date(),
            developerId: developer.id,
          },
        });
        const endpoint = await tx.catalogEndpoint.create({
          data: {
            source: "catalog-test",
            sourceEndpointId: randomUUID().replaceAll("-", "").padEnd(64, "a"),
            modelId: model.id,
            providerId: provider.id,
            endpointName: "Test endpoint",
            apiPath: "/api/v1/chat/completions",
            supportedParameters: ["temperature"],
            isActive: true,
            rawMetadata: { test_fixture: true },
            sourceFetchedAt: new Date(),
          },
        });
        const payload = JSON.stringify({ prompt: "0.000001", completion: "0.000002" });
        const price = await tx.catalogPriceSnapshot.create({
          data: {
            endpointId: endpoint.id,
            currency: "USD",
            promptPrice: "0.000001",
            completionPrice: "0.000002",
            requestPrice: "0",
            imagePrice: "0",
            sourceFetchedAt: new Date(),
            sourcePayloadHash: createHash("sha256").update(payload).digest("hex"),
          },
        });

        assert.equal(price.currency, "USD");
        await assert.rejects(
          tx.catalogPriceSnapshot.update({
            where: { id: price.id },
            data: { promptPrice: "0.5" },
          }),
        );
        await assert.rejects(
          tx.catalogPriceSnapshot.delete({ where: { id: price.id } }),
        );

        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
  } finally {
    await database.$disconnect();
  }
});
