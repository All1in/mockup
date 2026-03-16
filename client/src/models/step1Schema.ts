import z from 'zod';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpg',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const step1SchemaObj = z
  .object({
    name: z
      .string()
      .min(2)
      .regex(/^[a-zA-ZА-Яа-яёË]+$/),
    surname: z
      .string()
      .min(2)
      .regex(/^[a-zA-ZА-Яа-яёË]+$/),
    email: z.email(),
    password: z.string().min(8).regex(/[a-z]/).regex(/[\d]/).regex(/[A-Z]/),
    confirmPassword: z.string(),
    avatar: z
      .custom<FileList>()
      .optional()
      .transform((data) => {
        if (!data || data.length === 0) {
          return null;
        } else {
          return data[0];
        }
      })

      .refine(
        (file) => file === null || file.size <= MAX_FILE_SIZE,
        `Max file size is 5MB.`,
      )
      .refine(
        (file) => file === null || ACCEPTED_IMAGE_TYPES.includes(file.type),
        '.jpg, .jpeg, .png, and .webp files are accepted.',
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password don't match",
    path: ['confirmPassword'],
  });

export type step1Schema = z.infer<typeof step1SchemaObj>;
