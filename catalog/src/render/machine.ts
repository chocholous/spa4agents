import { Catalog, baseUrl, endpoint, isPaid, published, rail } from "../catalog.ts";
import { priceEntries, priceEntry } from "../pricing.ts";
import { Files, inputSchema, json, paymentBlock, priceText, toolDescription } from "./shared.ts";

/** Payment rails as machine data. x402 comes first; a rail without details yet carries only its id, status and note. */
function railsBlock(c: Catalog) {
  return c.payments.rails.map((r: any) => r.id === "x402"
    ? { id: r.id, status: r.status, protocol: r.protocol, scheme: r.scheme, asset: r.asset, network: r.active_network, mcp_challenge: r.mcp_challenge, rest_header: r.response_header }
    : { id: r.id, status: r.status, note: r.note });
}

function sessionBlock(c: Catalog) {
  const s = c.session;
  return {
    max_actions: s.max_actions,
    max_minutes: s.max_minutes,
    max_usd: s.max_usd,
    warning_at_percent: s.warning_at_percent,
    address_daily_cap_usd: s.address_daily_cap_usd,
  };
}

function trialBlock(c: Catalog) {
  const t = c.trial;
  return {
    unit: t.unit,
    free_sessions: t.free_sessions,
    max_turns_per_session: t.max_turns_per_session,
    turn_definition: t.turn_definition,
    valid_days: t.valid_days,
    covered: t.covered,
    summary: c.copy.trial_summary,
  };
}

function referralBlock(c: Catalog) {
  const r = c.referral;
  return {
    invitee_discount_percent: r.invitee_discount_percent,
    invitee_free_calls: r.invitee_free_calls,
    referrer_credit_percent: r.referrer_credit_percent,
    referrer_credit_days: r.referrer_credit_days,
    referrer_credit_after_first_paid_call: r.referrer_credit_after_first_paid_call,
    referrer_credit_monthly_cap_usd: r.referrer_credit_monthly_cap_usd,
    credit_is_money: r.credit_is_money,
  };
}

export function renderPricing(c: Catalog, files: Files) {
  files.set("pricing.json", json({
    service: c.brand.slug,
    currency: rail(c, "x402").asset,
    payment_rails: railsBlock(c).map((r: any) => (r.id === "x402" ? { id: r.id, status: r.status, protocol: r.protocol, scheme: r.scheme, network: r.network } : r)),
    session: sessionBlock(c),
    trial: trialBlock(c),
    referral: referralBlock(c),
    models: c.copy.price_model_names,
    pricing_status: priceEntries(c, published(c)).some((p) => p.status === "pending") ? "pending" : "final",
    pricing_pending_text: c.copy.llms.price_pending,
    tools: priceEntries(c, published(c)).map((p) => ({
      name: p.name,
      phase: p.phase,
      mechanism: p.mechanism,
      price_model: p.price_model,
      amount_usd: p.amount_usd,
      price_status: p.status,
      paid_with_x402: p.paid_with_x402,
      trial_eligible: p.trial_eligible,
      price_text: p.price_text,
    })),
  }));
}

export function renderMcp(c: Catalog, files: Files) {
  files.set("mcp.json", json({
    name: c.brand.slug,
    title: c.brand.name,
    description: c.brand.summary,
    endpoint: endpoint(c),
    transport: "streamable-http",
    protocol_version: c.session.mcp_protocol_version,
    rest_base: `${baseUrl(c)}/v1`,
    payments: { rails: railsBlock(c) },
    session: sessionBlock(c),
    data_policy: {
      url: `${baseUrl(c)}/data-policy.md`,
      status: c.data_policy.status,
      content_retention_days: c.data_policy.content_retention_days,
      checkpoint_stored: c.data_policy.checkpoint_stored,
      audit_content: c.data_policy.audit_content,
      confirmed_by_owner: c.data_policy.confirmed_by_owner,
    },
    hard_rules: c.copy.hard_rules,
    exit_rule: c.copy.exit_rule,
    tools: published(c).map((t: any) => {
      const schema = inputSchema(c, t);
      return {
        name: t.name,
        description: toolDescription(c, t),
        inputSchema: schema,
        mechanism: t.mechanism,
        price: { model: t.price.model, amount_usd: priceEntry(c, t).amount_usd, status: priceEntry(c, t).status },
        untrusted: !!t.untrusted,
        payment: paymentBlock(c, t),
        bazaar: isPaid(t) ? { type: "mcp", toolName: t.name, inputSchema: schema } : null,
      };
    }),
  }));
}

export function renderServer(c: Catalog, files: Files) {
  files.set("server.json", json({
    $schema: "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
    // registry_namespace may already be the full registry name (com.spagents/spagents) or only the namespace part.
    name: String(c.brand.registry_namespace).includes("/") ? c.brand.registry_namespace : `${c.brand.registry_namespace}/${c.brand.slug}`,
    title: c.brand.name,
    description: c.brand.short_description,
    version: c.brand.version,
    websiteUrl: baseUrl(c),
    remotes: [{ type: "streamable-http", url: endpoint(c) }],
    _meta: {
      "io.modelcontextprotocol.registry/publisher-provided": {
        pricing: {
          url: `${baseUrl(c)}/pricing.json`,
          currency: rail(c, "x402").asset,
          tools: priceEntries(c, published(c)).map((p) => ({ name: p.name, price_status: p.status, amount_usd: p.amount_usd })),
        },
      },
    },
  }));
}

const envelope = (c: Catalog) => ({
  type: "object",
  required: ["ok", "tool", "mechanism", "data", "untrusted", "cost", "session", "trial", "next"],
  properties: {
    ok: { type: "boolean" },
    tool: { type: "string" },
    mechanism: { enum: c.types.mechanisms },
    data: { type: "object" },
    untrusted: { type: "boolean" },
    cost: {
      type: "object",
      required: ["usd", "paid_with"],
      properties: { usd: { type: "string" }, paid_with: { type: "string" } },
    },
    session: {
      type: "object",
      required: ["actions_left", "minutes_left", "usd_left"],
      properties: { actions_left: { type: "integer" }, minutes_left: { type: "integer" }, usd_left: { type: "string" } },
    },
    trial: {
      type: ["object", "null"],
      properties: { sessions_left: { type: "integer" }, calls_left_in_session: { type: "integer" } },
    },
    next: { type: ["string", "null"] },
    warning: { type: "string" },
  },
});

export function renderOpenapi(c: Catalog, files: Files) {
  const paths: Record<string, any> = {};
  for (const t of published(c)) {
    const schema = inputSchema(c, t);
    const op: any = {
      operationId: t.name.replace(".", "_"),
      summary: t.description,
      description: toolDescription(c, t),
      tags: [t.name.split(".")[0]],
      responses: {
        "200": { description: t.output, content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
      },
      "x-mechanism": t.mechanism,
      "x-price": { model: t.price.model, amount_usd: priceEntry(c, t).amount_usd, status: priceEntry(c, t).status },
      "x-untrusted": !!t.untrusted,
    };
    if (t.inputs.length) {
      op.requestBody = {
        required: schema.required !== undefined || schema.anyOf !== undefined,
        content: { "application/json": { schema, example: t.example } },
      };
    }
    if (isPaid(t)) {
      op.responses["402"] = {
        description: `x402 payment required (${rail(c, "x402").scheme}, ${rail(c, "x402").asset}, ${rail(c, "x402").active_network}).`,
        headers: { [rail(c, "x402").response_header]: { schema: { type: "string" } } },
      };
    }
    paths[`/v1/${t.name}`] = { post: op };
  }
  files.set("openapi.json", json({
    openapi: "3.1.0",
    info: { title: c.brand.name, description: c.brand.summary, version: c.brand.version },
    servers: [{ url: baseUrl(c) }],
    paths,
    components: {
      schemas: { Envelope: envelope(c) },
    },
  }));
}
