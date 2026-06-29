// ─────────────────────────────────────────────────────────────
// Cloud AI "read from photo" service (optional).
//
// Uses Claude's vision capability to read structured data out of an uploaded
// photo: a VIN plate, a registration/plate, or a spec document (to pull the
// manufacturer fuel-consumption figure). It is OFF unless an API key is
// configured, and the caller sends an already-downscaled image, so cost per
// scan stays tiny.
//
// Uses the official Anthropic SDK with structured outputs so the model returns
// clean JSON we can drop straight into a form field.
// ─────────────────────────────────────────────────────────────
const config = require('../config');
const { ValidationError } = require('../utils/validate');

// What we can extract, with the prompt + JSON schema for each.
const TARGETS = {
  vin: {
    prompt:
      'This is a photo of a vehicle VIN plate or registration document. Read the 17-character VIN (Vehicle Identification Number). VINs use letters and digits but never the letters I, O or Q. If you cannot read it confidently, return null.',
    schema: {
      type: 'object',
      properties: {
        vin: { type: ['string', 'null'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['vin', 'confidence'],
      additionalProperties: false,
    },
  },
  rego: {
    prompt:
      'This is a photo of a vehicle registration/number plate or rego document. Read the registration (plate) number exactly as shown. If you cannot read it confidently, return null.',
    schema: {
      type: 'object',
      properties: {
        rego: { type: ['string', 'null'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['rego', 'confidence'],
      additionalProperties: false,
    },
  },
  spec: {
    prompt:
      "This is a photo of a vehicle's specification sheet or brochure. Find the manufacturer's combined/official fuel consumption in litres per 100 km (L/100km). If the figure is given in mpg or km/L, convert it to L/100km. Also read the engine size if shown. Return null for anything not present.",
    schema: {
      type: 'object',
      properties: {
        l_per_100km: { type: ['number', 'null'] },
        engine_size: { type: ['string', 'null'] },
      },
      required: ['l_per_100km', 'engine_size'],
      additionalProperties: false,
    },
  },
};

function status() {
  return { enabled: config.ai.enabled, model: config.ai.enabled ? config.ai.model : null };
}

/**
 * Extract structured data from an image buffer.
 * @param {Buffer} buffer image bytes (already downscaled by the client)
 * @param {string} mediaType e.g. "image/jpeg"
 * @param {'vin'|'rego'|'spec'} target what to read
 */
async function extractFromImage(buffer, mediaType, target) {
  if (!config.ai.enabled) {
    throw new ValidationError('AI scanning is not configured on this server.');
  }
  const cfg = TARGETS[target];
  if (!cfg) throw new ValidationError(`Unknown scan target "${target}".`);
  if (!buffer || !buffer.length) throw new ValidationError('An image is required.');
  if (!/^image\//.test(mediaType || '')) {
    throw new ValidationError('Only images can be scanned with AI.');
  }

  // Lazy-require so the app runs fine without the SDK when AI is disabled.
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.ai.apiKey });

  const response = await client.messages.create({
    model: config.ai.model,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: buffer.toString('base64'),
            },
          },
          { type: 'text', text: cfg.prompt },
        ],
      },
    ],
    output_config: { format: { type: 'json_schema', schema: cfg.schema } },
  });

  // With structured outputs, the first text block is valid JSON.
  const textBlock = response.content.find((b) => b.type === 'text');
  let data = {};
  try {
    data = JSON.parse(textBlock ? textBlock.text : '{}');
  } catch {
    data = {};
  }
  return { target, data, model: config.ai.model };
}

/**
 * Estimate analytical specs (manufacturer fuel consumption) for a known
 * make/model/year — fills the gap the free VIN database doesn't cover.
 * The result is an estimate the user confirms.
 */
async function enrichSpecs({ make, model, year }) {
  if (!config.ai.enabled) {
    throw new ValidationError('AI is not configured on this server.');
  }
  if (!make && !model) {
    throw new ValidationError('Decode or enter the make/model first.');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.ai.apiKey });

  const schema = {
    type: 'object',
    properties: {
      l_per_100km: { type: ['number', 'null'] },
      note: { type: ['string', 'null'] },
    },
    required: ['l_per_100km', 'note'],
    additionalProperties: false,
  };

  const response = await client.messages.create({
    model: config.ai.model,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              `What is the manufacturer's official combined fuel consumption in ` +
              `L/100km for a ${year || ''} ${make || ''} ${model || ''}? If ` +
              `several engine variants exist, give a typical value and say so in ` +
              `"note". Return null for l_per_100km if you are not reasonably sure.`,
          },
        ],
      },
    ],
    output_config: { format: { type: 'json_schema', schema } },
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  let data = {};
  try {
    data = JSON.parse(textBlock ? textBlock.text : '{}');
  } catch {
    data = {};
  }
  return { data, model: config.ai.model };
}

module.exports = { status, extractFromImage, enrichSpecs, TARGETS };
