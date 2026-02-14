import { err, ok } from 'neverthrow';
import { z } from 'zod';
import type { Env } from '../index';
import { tryCatchAsync } from './tryCatchAsync';

const clusteringResponseSchema = z.object({
  labels: z.array(z.number()),
  n_clusters: z.number(),
});

export async function clusterEmbeddings(env: Env, embeddings: number[][], minClusterSize = 3) {
  const response = await tryCatchAsync(
    fetch(`${env.MERIDIAN_ML_SERVICE_URL}/cluster`, {
      method: 'POST',
      body: JSON.stringify({ embeddings, min_cluster_size: minClusterSize }),
      headers: {
        Authorization: `Bearer ${env.MERIDIAN_ML_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
  );
  if (response.isErr()) {
    return err(response.error);
  }
  if (!response.value.ok) {
    return err(new Error(`Failed to fetch clusters: ${response.value.statusText}`));
  }

  const jsonResult = await tryCatchAsync(response.value.json());
  if (jsonResult.isErr()) {
    return err(jsonResult.error);
  }

  const parsedResponse = clusteringResponseSchema.safeParse(jsonResult.value);
  if (parsedResponse.success === false) {
    return err(new Error(`Invalid response ${JSON.stringify(parsedResponse.error)}`));
  }

  return ok(parsedResponse.data);
}
