import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  DATABASE_URL: Joi.string().required(),

  WORKOS_API_KEY: Joi.string().required(),
  WORKOS_CLIENT_ID: Joi.string().required(),
  WORKOS_REDIRECT_URI: Joi.string().uri().required(),

  CUSTOMER_JWT_SECRET: Joi.string().min(64).required(),

  // Storefront base URL — used to build admin-shared set-password links.
  STOREFRONT_URL: Joi.string().uri().default('http://localhost:3000'),

  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),

  STORAGE_BUCKET: Joi.string().required(),
  STORAGE_ACCOUNT_ID: Joi.string().required(),
  STORAGE_ACCESS_KEY_ID: Joi.string().required(),
  STORAGE_SECRET_ACCESS_KEY: Joi.string().required(),
  STORAGE_PUBLIC_URL: Joi.string().uri().required(),

  CORS_ORIGINS: Joi.string().default(''),
});
