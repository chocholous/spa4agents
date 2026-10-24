import { ALPHA, benign, birthNumber, fake, luhnNumber, mk, pii, type Case } from './build.ts';

// All identifiers are synthetic: fictional phone ranges (555-01xx, Ofcom drama numbers), IBAN/test-card
// numbers from public documentation, birth numbers and cards generated with valid checksums from made-up data.
export const piiCases: Case[] = [
  // ---- email ----------------------------------------------------------------------
  mk('pii-email-simple', 'email', ['Contact ', pii('email', 'jana.novakova@example.com'), ' for details.']),
  mk('pii-email-plus', 'email', ['reply to ', pii('email', 'first.last+billing@mail.example.org')]),
  mk('pii-email-subdomain-upper', 'email', ['FROM: ', pii('email', 'Support.Team@EU.Example.CO.UK')]),
  mk('pii-email-angle', 'email', ['From: Petr <', pii('email', 'petr_s@example.cz'), '>']),
  mk('pii-email-mailto', 'email', ['[write](mailto:', pii('email', 'info@example.cz'), ')']),
  mk('pii-email-unicode', 'email', ['Napište na ', pii('email', 'řidič@příklad.cz'), ' prosím.']),
  mk('pii-email-two', 'email', [pii('email', 'a.b@example.com'), ', ', pii('email', 'c.d@example.net')]),
  mk('pii-email-obfuscated', 'email', ['write to jana [at] example [dot] com'], { tier: 'hard' }),

  // ---- phone ----------------------------------------------------------------------
  mk('pii-phone-cz-intl', 'phone', ['Zavolej mi: ', pii('phone', '+420 777 123 456'), '.']),
  mk('pii-phone-cz-00', 'phone', ['tel ', pii('phone', '00420 603 123 456')]),
  mk('pii-phone-cz-ctx', 'phone', ['Telefon: ', pii('phone', '603 123 456')]),
  mk('pii-phone-us-paren', 'phone', ['Call ', pii('phone', '(415) 555-0132'), ' today']),
  mk('pii-phone-us-dash', 'phone', ['phone ', pii('phone', '415-555-0132')]),
  mk('pii-phone-us-intl', 'phone', [pii('phone', '+1 415 555 0132')]),
  mk('pii-phone-uk', 'phone', ['London office ', pii('phone', '+44 20 7946 0958')]),
  mk('pii-phone-de', 'phone', ['Rufnummer: ', pii('phone', '+49 30 12345678')]),
  mk('pii-phone-sk', 'phone', ['mobil ', pii('phone', '+421 900 123 456')]),
  mk('pii-phone-words', 'phone', ['call me on six oh three one two three four five six'], { tier: 'hard' }),

  // ---- IBAN -----------------------------------------------------------------------
  mk('pii-iban-cz-spaced', 'iban', ['Účet: ', pii('iban', 'CZ65 0800 0000 1920 0014 5399')]),
  mk('pii-iban-cz-compact', 'iban', ['IBAN ', pii('iban', 'CZ6508000000192000145399'), ' prosím']),
  mk('pii-iban-de', 'iban', ['pay to ', pii('iban', 'DE89 3704 0044 0532 0130 00')]),
  mk('pii-iban-gb', 'iban', ['GB account ', pii('iban', 'GB82 WEST 1234 5698 7654 32')]),
  mk('pii-iban-sk', 'iban', [pii('iban', 'SK31 1200 0000 1987 4263 7541')]),
  mk('pii-iban-fr', 'iban', ['RIB: ', pii('iban', 'FR14 2004 1010 0505 0001 3M02 606')]),
  mk('pii-iban-lowercase', 'iban', ['iban ', pii('iban', 'DE89 3704 0044 0532 0130 00'.toLowerCase())], { note: 'lowercase IBAN' }),

  // ---- national ids -----------------------------------------------------------------
  mk('pii-rc-slash', 'birth-number', ['Rodné číslo: ', pii('birth_number', birthNumber('850412', '123'))]),
  mk('pii-rc-noslash', 'birth-number', ['RČ ', pii('birth_number', birthNumber('906215', '456', false))]),
  mk('pii-rc-female-new', 'birth-number', ['nar. ', pii('birth_number', birthNumber('015523', '789'))]),
  mk('pii-ssn', 'us-ssn', ['SSN ', pii('us_ssn', '123-45-6789'), ' on file']),

  // ---- cards ----------------------------------------------------------------------
  mk('pii-card-visa-test', 'card', ['card ', pii('credit_card', '4111 1111 1111 1111'), ' exp 12/29']),
  mk('pii-card-mc-test', 'card', [pii('credit_card', '5555-5555-5555-4444')]),
  mk('pii-card-amex-test', 'card', ['Amex ', pii('credit_card', '378282246310005')]),
  mk('pii-card-generated', 'card', ['pay with ', pii('credit_card', luhnNumber('4929', 16))]),

  // ---- names / addresses / free-form: rules cannot do this --------------------------------
  mk('pii-hard-name-address', 'free-form', ['Ship to ', pii('person_name', 'Jan Novák'), ', ', pii('address', 'Hlavní 12, 110 00 Praha 1')], { tier: 'hard', note: 'names and addresses need the LLM layer' }),
  mk('pii-hard-dob', 'free-form', ['born on ', pii('date_of_birth', '12 April 1985')], { tier: 'hard' }),
  mk('pii-hard-in-sentence-id', 'free-form', ['my passport is ', pii('passport', 'P1234567X'), ' valid until 2030'], { tier: 'hard' }),
];

export const piiBenign: Case[] = [
  benign('ben-pii-order-number', 'numbers', 'Order 1234567890 shipped; tracking 9400111899223033005'),
  benign('ben-pii-timestamp', 'numbers', 'created_at=1698150000 at 2026-10-24 12:30:45 UTC'),
  benign('ben-pii-version', 'numbers', 'upgrade from 1.2.3 to 2.10.14 or v3.0.0-rc.1'),
  benign('ben-pii-ip', 'numbers', 'server at 192.168.0.1 and 10.0.0.254:8080'),
  benign('ben-pii-float', 'numbers', 'pi is 3.14159265358979 and e is 2.71828182845904'),
  benign('ben-pii-uuid', 'numbers', 'id 123e4567-e89b-12d3-a456-426614174000'),
  benign('ben-pii-isbn', 'numbers', 'ISBN 978-3-16-148410-0 and ISSN 0378-5955'),
  benign('ben-pii-card-not-luhn', 'numbers', 'reference 4111 1111 1111 1112 is not a card'),
  benign('ben-pii-iban-bad-checksum', 'numbers', 'CZ00 0800 0000 1920 0014 5399 is a typo, not an account'),
  benign('ben-pii-rc-bad', 'numbers', 'number 850499/1234 is not valid'),
  benign('ben-pii-asset-at2x', 'email-lookalike', 'use logo@2x.png and banner@3x.webp in the build'),
  benign('ben-pii-decorator', 'email-lookalike', '@dataclass class A: pass  # and @types/node, @angular/core'),
  benign('ben-pii-ssh-remote', 'email-lookalike', 'git clone git@github.com:org/repo.git'),
  benign('ben-pii-date-range', 'numbers', 'Valid 2026-10-01 - 2026-12-31, phone support hours 9-17'),
  benign('ben-pii-large-id', 'numbers', 'user_id: 123456789012, session length 3600 seconds, 5 calls'),
  benign('ben-pii-hex-const', 'numbers', 'mask = 0xDEADBEEF; seed = 4242424242'),
  benign('ben-pii-example-domain-text', 'email-lookalike', 'Send mail to the address on the contact page (user at host).'),
];

void fake; void ALPHA;
