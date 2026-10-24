import { ALPHA, benign, cat, fake, mk, sec, type Case } from './build.ts';

const f = fake;

export const secretCases: Case[] = [
  // ---- provider key formats -------------------------------------------------------
  mk('sec-openai-proj', 'openai', ['Use this: ', sec('openai_key', cat('sk-', 'proj-', f(100, ALPHA.b62url))), ' for the call.']),
  mk('sec-openai-legacy', 'openai', ['OPENAI_API_KEY=', sec('openai_key', cat('sk-', f(20, ALPHA.b62), 'T3BlbkFJ', f(20, ALPHA.b62)))]),
  mk('sec-openai-svcacct', 'openai', ['key: ', sec('openai_key', cat('sk-', 'svcacct-', f(70, ALPHA.b62url)))]),
  mk('sec-anthropic-api03', 'anthropic', ['export ANTHROPIC_API_KEY="', sec('anthropic_key', cat('sk-', 'ant-', 'api03-', f(93, ALPHA.b62url), 'AA')), '"']),
  mk('sec-anthropic-admin', 'anthropic', ['admin key ', sec('anthropic_key', cat('sk-', 'ant-', 'admin01-', f(80, ALPHA.b62url))), ' (rotate me)']),
  mk('sec-aws-akia', 'aws', ['aws_access_key_id = ', sec('aws_access_key_id', cat('AK', 'IA', f(16, ALPHA.upper32)))]),
  mk('sec-aws-doc-example', 'aws', ['The docs example: ', sec('aws_access_key_id', cat('AKIA', 'IOSFODNN7', 'EXAMPLE'))]),
  mk('sec-aws-asia', 'aws', ['temp creds ', sec('aws_access_key_id', cat('AS', 'IA', f(16, ALPHA.upper32)))]),
  mk('sec-aws-secret', 'aws', ['aws_secret_access_key = ', sec('password', f(40, ALPHA.b64))], { note: 'type is reported as generic_secret/password; only the span matters' }),
  mk('sec-aws-pair-env', 'aws', ['AWS_ACCESS_KEY_ID=', sec('aws_access_key_id', cat('AK', 'IA', f(16, ALPHA.upper32))), '\nAWS_SECRET_ACCESS_KEY=', sec('generic_secret', f(40, ALPHA.b64))]),
  mk('sec-github-ghp', 'github', ['git clone https://x:', sec('github_token', cat('gh', 'p_', f(36, ALPHA.b62))), '@github.com/org/repo.git']),
  mk('sec-github-gho', 'github', ['token ', sec('github_token', cat('gh', 'o_', f(36, ALPHA.b62)))]),
  mk('sec-github-ghs', 'github', ['server-to-server ', sec('github_token', cat('gh', 's_', f(36, ALPHA.b62)))]),
  mk('sec-github-fine', 'github', ['GITHUB_TOKEN=', sec('github_token', cat('github', '_pat_', f(22, ALPHA.b62), '_', f(59, ALPHA.b62)))]),
  mk('sec-gitlab', 'gitlab', ['GITLAB_TOKEN: ', sec('gitlab_token', cat('gl', 'pat-', f(20, ALPHA.b62url)))]),
  mk('sec-stripe-live', 'stripe', ['stripe.api_key = "', sec('stripe_key', cat('sk', '_live_', f(24, ALPHA.b62))), '"']),
  mk('sec-stripe-test', 'stripe', ['test mode key ', sec('stripe_key', cat('sk', '_test_', f(24, ALPHA.b62)))]),
  mk('sec-stripe-restricted', 'stripe', ['restricted: ', sec('stripe_key', cat('rk', '_live_', f(30, ALPHA.b62)))]),
  mk('sec-stripe-whsec', 'stripe', ['STRIPE_WEBHOOK_SECRET=', sec('stripe_key', cat('wh', 'sec_', f(32, ALPHA.b62)))]),
  mk('sec-slack-bot', 'slack', ['SLACK_BOT_TOKEN=', sec('slack_token', cat('xo', 'xb-', f(12, ALPHA.digits), '-', f(12, ALPHA.digits), '-', f(24, ALPHA.b62)))]),
  mk('sec-slack-user', 'slack', ['user token ', sec('slack_token', cat('xo', 'xp-', f(12, ALPHA.digits), '-', f(12, ALPHA.digits), '-', f(12, ALPHA.digits), '-', f(32, ALPHA.hex)))]),
  mk('sec-slack-webhook', 'slack', ['curl -X POST ', sec('slack_webhook', cat('https://hooks.', 'slack.com/services/', 'T', f(8, ALPHA.alnumUpper), '/B', f(8, ALPHA.alnumUpper), '/', f(24, ALPHA.b62)))]),
  mk('sec-google-api', 'google', ['key=', sec('google_api_key', cat('AI', 'za', f(35, ALPHA.b62url)))]),
  mk('sec-google-oauth', 'google', ['Access token: ', sec('google_oauth_token', cat('ya', '29.', f(120, ALPHA.b62url)))]),
  mk('sec-huggingface', 'misc-providers', ['HF_TOKEN=', sec('huggingface_token', cat('hf', '_', f(34, ALPHA.letters)))]),
  mk('sec-npm', 'misc-providers', ['//registry.npmjs.org/:_authToken=', sec('npm_token', cat('npm', '_', f(36, ALPHA.b62)))]),
  mk('sec-pypi', 'misc-providers', ['password = ', sec('pypi_token', cat('pypi', '-AgEIcHlwaS5vcmc', f(80, ALPHA.b62url)))]),
  mk('sec-sendgrid', 'misc-providers', ['SENDGRID=', sec('sendgrid_key', cat('SG', '.', f(22, ALPHA.b62url), '.', f(43, ALPHA.b62url)))]),
  mk('sec-twilio-sk', 'misc-providers', ['TWILIO_API_KEY=', sec('twilio_key', cat('S', 'K', f(32, ALPHA.hex)))]),
  mk('sec-shopify', 'misc-providers', ['X-Shopify-Access-Token: ', sec('shopify_token', cat('shp', 'at_', f(32, ALPHA.hex)))]),
  mk('sec-digitalocean', 'misc-providers', ['DO_TOKEN=', sec('digitalocean_token', cat('do', 'p_v1_', f(64, ALPHA.hex)))]),

  // ---- private keys ---------------------------------------------------------------
  mk('sec-pem-rsa', 'private-key', ['config:\n', sec('private_key', cat('-----BEGIN ', 'RSA PRIVATE KEY-----\n', f(64, ALPHA.b64), '\n', f(64, ALPHA.b64), '\n', f(40, ALPHA.b64), '\n-----END RSA PRIVATE KEY-----')), '\nend']),
  mk('sec-pem-pkcs8', 'private-key', [sec('private_key', cat('-----BEGIN ', 'PRIVATE KEY-----\n', f(64, ALPHA.b64), '\n', f(64, ALPHA.b64), '\n-----END PRIVATE KEY-----'))]),
  mk('sec-pem-ec', 'private-key', ['key:\n', sec('private_key', cat('-----BEGIN ', 'EC PRIVATE KEY-----\n', f(64, ALPHA.b64), '\n', f(30, ALPHA.b64), '\n-----END EC PRIVATE KEY-----'))]),
  mk('sec-pem-openssh', 'private-key', [sec('private_key', cat('-----BEGIN ', 'OPENSSH PRIVATE KEY-----\n', f(70, ALPHA.b64), '\n', f(70, ALPHA.b64), '\n', f(20, ALPHA.b64), '\n-----END OPENSSH PRIVATE KEY-----'))]),
  mk('sec-pem-pgp', 'private-key', [sec('private_key', cat('-----BEGIN ', 'PGP PRIVATE KEY BLOCK-----\n\n', f(64, ALPHA.b64), '\n', f(64, ALPHA.b64), '\n-----END PGP PRIVATE KEY BLOCK-----'))]),
  mk('sec-pem-truncated', 'private-key', ['pasted partially:\n', sec('private_key', cat('-----BEGIN ', 'RSA PRIVATE KEY-----\n', f(64, ALPHA.b64), '\n', f(64, ALPHA.b64)))], { note: 'no END line; must still be removed to end of text/blank line' }),

  // ---- tokens: JWT, bearer, basic --------------------------------------------------
  mk('sec-jwt', 'jwt', ['session=', sec('jwt', cat('ey', 'J', f(30, ALPHA.b62url), '.ey', 'J', f(60, ALPHA.b62url), '.', f(43, ALPHA.b62url)))]),
  mk('sec-jwt-alg-none', 'jwt', ['token ', sec('jwt', cat('ey', 'JhbGciOiJub25lIn0.ey', 'JzdWIiOiIxMjM0NTY3ODkwIn0.'))]),
  mk('sec-bearer-curl', 'bearer', ['curl -H "Authorization: Bearer ', sec('bearer_token', f(40, ALPHA.b62url)), '" https://api.example.test/v1/me']),
  mk('sec-bearer-prose', 'bearer', ['Send header Bearer ', sec('bearer_token', f(32, ALPHA.b62)), ' with every request.']),
  mk('sec-basic-auth', 'bearer', ['Authorization: Basic ', sec('auth_header', f(28, ALPHA.b64) + '=='), '\nHost: example.test']),
  mk('sec-x-api-key', 'header', ['x-api-key: ', sec('generic_secret', f(40, ALPHA.b62))]),

  // ---- connection strings ----------------------------------------------------------
  mk('sec-conn-postgres', 'connection-string', ['DATABASE_URL=', sec('connection_string', cat('postgres', '://app_user:', f(18, ALPHA.b62), '@db.internal.example:5432/prod'))]),
  mk('sec-conn-mongo-srv', 'connection-string', [sec('connection_string', cat('mongodb+srv', '://admin:', f(16, ALPHA.b62), '@cluster0.abcde.example.net/test?retryWrites=true'))]),
  mk('sec-conn-redis-nouser', 'connection-string', ['REDIS=', sec('connection_string', cat('redis', '://:', f(20, ALPHA.b62), '@cache.internal.example:6379/0'))]),
  mk('sec-conn-amqp', 'connection-string', [sec('connection_string', cat('amqps', '://svc:', f(14, ALPHA.b62), '@mq.example.test:5671/vhost'))]),
  mk('sec-conn-mysql', 'connection-string', ['mysql', '://root:', sec('connection_string', f(12, ALPHA.b62)), '@127.0.0.1/app'], { note: 'span = password part; whole-URI redaction also covers it' }),
  mk('sec-conn-https-creds', 'connection-string', ['git remote add origin ', sec('connection_string', cat('https', '://ci-bot:', f(20, ALPHA.b62), '@git.example.test/org/repo.git'))]),
  mk('sec-conn-azure-storage', 'connection-string', ['DefaultEndpointsProtocol=https;AccountName=stdemo;AccountKey=', sec('generic_secret', f(86, ALPHA.b64) + '=='), ';EndpointSuffix=core.windows.net']),
  mk('sec-conn-ado', 'connection-string', ['Server=tcp:db.example.test,1433;Database=app;User Id=sa;Password=', sec('password', f(16, ALPHA.b62)), ';Encrypt=true;']),
  mk('sec-conn-jdbc', 'connection-string', ['jdbc:postgresql://db.example.test:5432/app?user=app&password=', sec('password', f(14, ALPHA.b62))]),

  // ---- assignments in config/code/markdown ------------------------------------------
  mk('sec-env-line', 'assignment', ['# .env\nAPP_ENV=prod\nSESSION_SECRET=', sec('generic_secret', f(48, ALPHA.b62)), '\nPORT=8080\n']),
  mk('sec-json-apikey', 'assignment', ['{"service":"geo","apiKey":"', sec('generic_secret', f(32, ALPHA.b62)), '","timeout":5}']),
  mk('sec-yaml-password', 'assignment', ['db:\n  user: app\n  password: ', sec('password', 'Tr0ub4dor&3x9Z'), '\n  host: db']),
  mk('sec-code-const', 'assignment', ['const client = new Client({ apiKey: "', sec('generic_secret', f(36, ALPHA.b62)), '" });']),
  mk('sec-markdown-fence', 'assignment', ['Setup:\n```bash\nexport MY_SERVICE_TOKEN=', sec('generic_secret', f(40, ALPHA.b62)), '\n```\n']),
  mk('sec-url-query', 'assignment', ['GET https://api.example.test/v2/data?format=json&api_key=', sec('generic_secret', f(32, ALPHA.b62)), '&limit=10']),
  mk('sec-password-prose', 'assignment', ['The admin password is ', sec('password', 'hunter2hunter2'), ', do not share.']),
  mk('sec-two-in-one', 'multi', ['k1=', sec('openai_key', cat('sk-', f(20, ALPHA.b62), 'T3BlbkFJ', f(20, ALPHA.b62))), ' and k2=', sec('github_token', cat('gh', 'p_', f(36, ALPHA.b62)))]),
  mk('sec-multiline-log', 'multi', ['2026-10-24 INFO start\n2026-10-24 DEBUG headers: Authorization: Bearer ', sec('bearer_token', f(36, ALPHA.b62url)), '\n2026-10-24 INFO done\n']),

  // ---- Banya placeholder (OPEN_QUESTIONS #1) ----------------------------------------
  mk('sec-banya-placeholder-assign', 'banya-placeholder', ['sauna.detox input: api_key=', sec('generic_secret', f(40, ALPHA.b62))], {
    pending: true,
    note: 'PLACEHOLDER. Real format of the key leaked by Banya sauna.detox is not in docs/podklady.md. Owner must supply it.',
  }),

  // ---- hard (obfuscated / encoded): rules are NOT expected to catch these ---------------
  mk('sec-hard-base64-wrapped', 'obfuscated', ['encoded: ', sec('openai_key', btoa(cat('sk-', 'proj-', f(60, ALPHA.b62)))) ], { tier: 'hard', note: 'base64 of a key' }),
  mk('sec-hard-split-lines', 'obfuscated', ['key part 1: ', sec('github_token', cat('gh', 'p_', f(18, ALPHA.b62))), '\nkey part 2 (append): ', sec('github_token', f(18, ALPHA.b62))], { tier: 'hard', note: 'second half has no recognizable prefix' }),
  mk('sec-hard-spaced', 'obfuscated', ['my key: ', sec('openai_key', 's k - p r o j - ' + [...f(30, ALPHA.b62)].join(' '))], { tier: 'hard', note: 'characters separated by spaces' }),
  mk('sec-hard-reversed', 'obfuscated', ['reversed: ', sec('github_token', [...cat('gh', 'p_', f(36, ALPHA.b62))].reverse().join(''))], { tier: 'hard' }),
  mk('sec-hard-words', 'obfuscated', ['the key is ', sec('generic_secret', 'AKIA four one seven alpha bravo charlie delta echo foxtrot golf hotel')], { tier: 'hard', note: 'spelled out' }),
  mk('sec-hard-bare-hex', 'obfuscated', ['Here you go: ', sec('generic_secret', f(40, ALPHA.hex)), ' (it is for the billing API)'], { tier: 'hard', note: 'no prefix, no keyword; only context says it is a secret' }),
];

export const secretBenign: Case[] = [
  benign('ben-sec-git-sha', 'hash', 'commit 3f2b9c1d4e5a6b7c8d9e0f1a2b3c4d5e6f708192 fixes the bug'),
  benign('ben-sec-sha256', 'hash', 'sha256: ' + f(64, ALPHA.hex)),
  benign('ben-sec-uuid', 'hash', 'request id 123e4567-e89b-12d3-a456-426614174000 failed'),
  benign('ben-sec-sklearn', 'prefix-lookalike', 'pip install scikit-learn; import sklearn; "sk-learn" is a nickname'),
  benign('ben-sec-task-slug', 'prefix-lookalike', 'branch task-management-system-enterprise-edition-v2 merged'),
  benign('ben-sec-placeholder-key', 'placeholder', 'Set OPENAI_API_KEY=YOUR_API_KEY_HERE in your environment'),
  benign('ben-sec-env-ref', 'placeholder', 'client = OpenAI(api_key=os.environ["OPENAI_API_KEY"]) and ${GITHUB_TOKEN}'),
  benign('ben-sec-process-env', 'placeholder', 'const apiKey = process.env.STRIPE_SECRET_KEY;'),
  benign('ben-sec-masked', 'placeholder', 'password: ********\napi_key: xxxxxxxxxxxxxxxx'),
  benign('ben-sec-bearer-placeholder', 'placeholder', 'Authorization: Bearer <your-token-here>'),
  benign('ben-sec-sk-ellipsis', 'placeholder', 'keys look like sk-... and are secret'),
  benign('ben-sec-prose-password', 'prose', 'The password field is required and must contain at least eight characters.'),
  benign('ben-sec-prose-token', 'prose', 'Each request consumes tokens; max_tokens: 4096 and token_count: 1500 are shown.'),
  benign('ben-sec-public-key', 'public-material', '-----BEGIN PUBLIC KEY-----\n' + fake(64, ALPHA.b64) + '\n-----END PUBLIC KEY-----'),
  benign('ben-sec-cert', 'public-material', '-----BEGIN CERTIFICATE-----\n' + fake(64, ALPHA.b64) + '\n-----END CERTIFICATE-----'),
  benign('ben-sec-ssh-remote', 'public-material', 'git remote add origin git@github.com:org/repo.git'),
  benign('ben-sec-url-no-creds', 'url', 'See https://example.test/docs/auth?lang=en#tokens for details.'),
  benign('ben-sec-data-uri', 'blob', 'img src="data:image/png;base64,' + fake(120, ALPHA.b64) + '"'),
  benign('ben-sec-pk-publishable', 'ambiguous', 'publishable key ' + cat('pk', '_live_', fake(24, ALPHA.b62)) + ' is embedded in the web page by design', { tier: 'hard', note: 'publishable keys are public by design; current rules do not match pk_' }),
];
