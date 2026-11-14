import { z } from "zod";

const decimalString = z.string().regex(/^\d+(?:\.\d+)?$/).max(64);

export const openRouterModelSchema = z.object({
  id: z.string().min(3).max(255),
  canonical_slug: z.string().min(3).max(255).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(50_000).nullable().optional(),
  created: z.number().int().nonnegative().optional(),
  context_length: z.number().int().positive().optional(),
  top_provider: z.object({ max_completion_tokens: z.number().int().positive().optional() }).passthrough().optional(),
  expiration_date: z.string().datetime().nullable().optional(),
  architecture: z.object({
    input_modalities: z.array(z.string()).optional(),
    output_modalities: z.array(z.string()).optional(),
  }).passthrough().optional(),
  endpoints: z.array(z.string()).optional(),
  supported_parameters: z.array(z.string()).optional(),
}).passthrough();

export const openRouterEndpointSchema = z.object({
  model_id: z.string().min(3).max(255),
  name: z.string().min(1).max(255),
  provider_name: z.string().min(1).max(255),
  tag: z.string().min(1).max(255),
  context_length: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  max_prompt_tokens: z.number().int().positive().optional(),
  quantization: z.string().max(64).nullable().optional(),
  supported_parameters: z.array(z.string()).optional(),
  pricing: z.object({
    prompt: decimalString,
    completion: decimalString,
    request: decimalString.optional(),
    image: decimalString.optional(),
  }).passthrough(),
}).passthrough();

export const openRouterModelsResponseSchema = z.object({
  data: z.array(openRouterModelSchema),
});

export const openRouterEndpointResponseSchema = z.object({
  data: z.object({
    id: z.string().min(3).max(255),
    name: z.string().min(1).max(255),
    endpoints: z.array(openRouterEndpointSchema),
  }).passthrough(),
});

export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;
export type OpenRouterEndpoint = z.infer<typeof openRouterEndpointSchema>;
