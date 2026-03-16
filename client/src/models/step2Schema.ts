import z from 'zod';

const ACCEPTED_FILE_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const step2SchemaObj = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('personal'),
    dateOfBirth: z.date().refine((date) => {
      const d1 = new Date();
      const d2 = date;
      const years = d1.getFullYear() - d2.getFullYear();

      const isBeforeThreshold =
        d2.getMonth() < d1.getMonth() ||
        (d2.getMonth() === d1.getMonth() && d2.getDate() < d1.getDate());

      const isAged = isBeforeThreshold ? years - 1 : years;
      return isAged >= 18;
    }),
  }),
  z.object({
    type: z.literal('business'),
    companyName: z.string().min(2),
    inn: z
      .string()
      .regex(/^\d+$/)
      .refine((inn) => inn.length === 8 || inn.length === 10),
    document: z
      .custom<FileList>()
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
        (file) => file === null || ACCEPTED_FILE_TYPES.includes(file.type),
        '.pdf files are accepted.',
      ),
  }),
]);

export type step2Schema = z.infer<typeof step2SchemaObj>;
