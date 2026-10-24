import { Catalog, baseUrl, endpoint, isPaid, published } from "../catalog.ts";
import { Files, inputSchema, json, paymentBlock, priceText, toolDescription } from "./shared.ts";

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
    valid_days: t.valid_days,
    covered_tools: published(c).filter((x: any) => x.trial_eligible).map((x: any) => x.name),
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
    header: c.session.referral_header,
  };
}

export function renderPricing(c: Catalog, files: Files) {
  files.set("pricing.json", json({
    service: c.brand.slug,
    currency: c.payments.asset,
    payment: { protocol: c.payments.protocol, scheme: c.payments.scheme, network: c.payments.active_network },
    session: sessionBlock(c),
    trial: trialBlock(c),
    referral: referralBlock(c),
    affiliate: { percent: c.affiliate.percent, months: c.affiliate.months, payout_phase: c.affiliate.payout_phase },
    models: c.copy.price_model_names,
    tools: published(c).map((t: any) => ({
      name: t.name,
      phase: t.phase,
      mechanism: t.mechanism,
      price_model: t.price.model,
      amount_usd: t.price.amount_usd,
      paid_with_x402: isPaid(t),
      trial_eligible: !!t.trial_eligible,
      price_text: priceText(c, t),
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
    headers: { guest_pass: c.session.guest_pass_header, referral: c.session.referral_header },
    payments: {
      protocol: c.payments.protocol,
      scheme: c.payments.scheme,
      asset: c.payments.asset,
      network: c.payments.active_network,
      mcp_challenge: c.payments.mcp_challenge,
      rest_header: c.payments.response_header,
    },
    session: sessionBlock(c),
    data_policy: {
      url: `${baseUrl(c)}/data-policy.md`,
      status: c.data_policy.status,
      content_retention_days: c.data_policy.content_retention_days,
      checkpoint_stored: c.data_policy.checkpoint_stored,
      audit_days: c.data_policy.audit_days,
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
        price: { model: t.price.model, amount_usd: t.price.amount_usd },
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
    name: `${c.brand.registry_namespace}/${c.brand.slug}`,
    title: c.brand.name,
    description: c.brand.short_description,
    version: c.brand.version,
    websiteUrl: baseUrl(c),
    remotes: [{ type: "streamable-http", url: endpoint(c) }],
  }));
}

const envelope = (c: Catalog) => ({
  type: "object",
  required: ["ok", "tool", "mechanism", "data", "untrusted", "cost", "session", "next"],
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
      parameters: [
        { $ref: "#/components/parameters/GuestPass" },
        { $ref: "#/components/parameters/Referral" },
      ],
      responses: {
        "200": { description: t.output, content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
      },
      "x-mechanism": t.mechanism,
      "x-price": { model: t.price.model, amount_usd: t.price.amount_usd },
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
        description: `x402 payment required (${c.payments.scheme}, ${c.payments.asset}, ${c.payments.active_network}).`,
        headers: { [c.payments.response_header]: { schema: { type: "string" } } },
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
      parameters: {
        GuestPass: { name: c.session.guest_pass_header, in: "header", required: false, schema: { type: "string" } },
        Referral: { name: c.session.referral_header, in: "header", required: false, schema: { type: "string" } },
      },
      schemas: { Envelope: envelope(c) },
    },
  }));
}
