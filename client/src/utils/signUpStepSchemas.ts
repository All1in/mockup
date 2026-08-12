import { z } from 'zod';

export const personalDataSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters.')
      .regex(/^\p{L}+$/u, 'Only letters are allowed.'),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters.')
      .regex(/^\p{L}+$/u, 'Only letters are allowed.'),
    email: z.string().trim().min(1, 'Email is required.').email('Please enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/\d/, 'Password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    avatar: z
      .instanceof(File)
      .nullable()
      .refine((file) => !file || ['image/jpeg', 'image/png'].includes(file.type), {
        message: 'Only JPG and PNG files are allowed.',
      })
      .refine((file) => !file || file.size <= 2 * 1024 * 1024, {
        message: 'Maximum file size is 2 MB.',
      }),
  })
  .superRefine((data, ctx) => {
    if (data.avatar === null) {
      ctx.addIssue({ code: 'custom', path: ['avatar'], message: 'Avatar is required.' });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
    }
  });

export type PersonalDataValues = z.infer<typeof personalDataSchema>;

function isAtLeast18(date: Date): boolean {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setFullYear(now.getFullYear() - 18);
  return date <= threshold;
}

const innSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'INN / EDRPOU must contain only digits.')
  .refine((v) => v.length === 8 || v.length === 10, 'INN / EDRPOU must be exactly 8 or 10 digits.');

export const accountTypeSchema = z.discriminatedUnion('accountType', [
  z.object({
    accountType: z.literal('personal'),
    birthDate: z
      .string()
      .trim()
      .min(1, 'Birth date is required.')
      .refine((v) => {
        const d = new Date(v);
        return !Number.isNaN(d.getTime());
      }, 'Invalid birth date.')
      .refine((v) => isAtLeast18(new Date(v)), 'You must be at least 18 years old.'),
  }),
  z.object({
    accountType: z.literal('business'),
    companyName: z.string().trim().min(2, 'Company name must be at least 2 characters.'),
    inn: innSchema,
    companyDocument: z
      .instanceof(File)
      .nullable()
      .refine((file) => !file || file.type === 'application/pdf', { message: 'Only PDF is allowed.' })
      .refine((file) => !file || file.size <= 5 * 1024 * 1024, { message: 'Maximum file size is 5 MB.' }),
  }),
]);

export type AccountTypeValues = z.infer<typeof accountTypeSchema>;

export const accountTypeSchemaWithRequiredFiles = accountTypeSchema.superRefine((data, ctx) => {
  if (data.accountType === 'business') {
    if (data.companyDocument === null) {
      ctx.addIssue({ code: 'custom', path: ['companyDocument'], message: 'Company document is required.' });
    }
  }
});

export const confirmationSchema = z.object({
  termsAccepted: z.literal(true, { message: 'You must accept the terms.' }),
});

export type ConfirmationValues = z.infer<typeof confirmationSchema>;

